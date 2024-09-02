const { ethers } = require("ethers");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

function hex2str(hex) {
  return ethers.toUtf8String(hex);
}

function str2hex(payload) {
  return ethers.hexlify(ethers.toUtf8Bytes(payload));
}

let tasks = {};
let userBalances = {};
let taskIdCounter = 0;

const TASK_REWARD = 10; 

async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));

  const metadata = data["metadata"];
  const sender = metadata["msg_sender"];
  const payload = hex2str(data["payload"]);

  try {
    const { action, taskId, title, description, assignee, status } = JSON.parse(payload);

    if (!userBalances[sender]) userBalances[sender] = 0;

    let responseMessage = "";

    switch (action) {
      case "create":
        if (!title || !description || !assignee) {
          throw new Error("Title, description, and assignee are required for task creation.");
        }
        taskIdCounter++;
        tasks[taskIdCounter] = {
          id: taskIdCounter,
          title,
          description,
          creator: sender,
          assignee,
          status: "Open",
          createdAt: Date.now()
        };
        responseMessage = `Task created with ID: ${taskIdCounter}`;
        break;

      case "update":
        if (!taskId || !status) {
          throw new Error("TaskId and status are required for update.");
        }
        if (!tasks[taskId]) {
          throw new Error("Task does not exist.");
        }
        if (sender !== tasks[taskId].assignee && sender !== tasks[taskId].creator) {
          throw new Error("Only the task creator or assignee can update the task.");
        }
        if (!["Open", "In Progress", "Completed"].includes(status)) {
          throw new Error("Invalid status. Use 'Open', 'In Progress', or 'Completed'.");
        }
        
        const oldStatus = tasks[taskId].status;
        tasks[taskId].status = status;
        
        if (status === "Completed" && oldStatus !== "Completed") {
          userBalances[tasks[taskId].assignee] += TASK_REWARD;
          responseMessage = `Task ${taskId} marked as Completed. ${tasks[taskId].assignee} earned ${TASK_REWARD} tokens.`;
        } else {
          responseMessage = `Task ${taskId} updated to status: ${status}`;
        }
        break;

      case "reassign":
        if (!taskId || !assignee) {
          throw new Error("TaskId and new assignee are required for reassignment.");
        }
        if (!tasks[taskId]) {
          throw new Error("Task does not exist.");
        }
        if (sender !== tasks[taskId].creator) {
          throw new Error("Only the task creator can reassign the task.");
        }
        tasks[taskId].assignee = assignee;
        responseMessage = `Task ${taskId} reassigned to ${assignee}`;
        break;

      default:
        throw new Error("Invalid action. Use 'create', 'update', or 'reassign'.");
    }

    const notice_req = await fetch(rollup_server + "/notice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: str2hex(responseMessage) }),
    });

    return "accept";
  } catch (error) {
    const report_req = await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: str2hex(error.message) }),
    });

    return "reject";
  }
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));

  const sender = data.metadata.msg_sender;
  const payload = hex2str(data["payload"]);

  const [route, ...params] = payload.split(" ");

  let responseObject;

  switch (route) {
    case "list":
      responseObject = JSON.stringify(Object.values(tasks));
      break;

    case "task":
      const taskId = params[0].split('/')[1];
      if (!tasks[taskId]) {
        responseObject = "Task does not exist.";
      } else {
        responseObject = JSON.stringify(tasks[taskId]);
      }
      break;

    case "balance":
      responseObject = JSON.stringify({ balance: userBalances[sender] || 0 });
      break;

    case "my_tasks":
      const userTasks = Object.values(tasks).filter(task => 
        task.assignee === sender || task.creator === sender
      );
      responseObject = JSON.stringify(userTasks);
      break;

    default:
      responseObject = "Invalid route. Use 'list', 'task <taskId>', 'balance', or 'my_tasks'.";
  }

  const report_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: str2hex(responseObject) }),
  });

  return "accept";
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();