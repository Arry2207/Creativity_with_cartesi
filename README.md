# Task Rewarding Dapp

TaskRewarding is a decentralized task management application powered by Cartesi Rollups. It allows users to create, update, and reassign tasks, as well as earn tokens for completing tasks.

## Installation Instructions

Follow the [Cartesi Rollups installation guide](https://docs.cartesi.io/cartesi-rollups/1.3/development/installation/)

## Compiling and Running Instructions

1. Clone the repository
2. Run `cd tasktesi`
3. Run `cartesi build`
4. Run `cartesi run`
5. Run `cartesi send` on a new terminal tab to send inputs to the application

## Usage

### Advance Requests

Send advance requests with payloads in the following formats:

#### Create a Task

```json
{
  "action": "create",
  "title": "Complete project documentation",
  "description": "Write and review all project documents",
  "assignee": "0x1234...5678"
}
```

#### Update Task Status

```json
{
  "action": "update",
  "taskId": 1,
  "status": "In Progress"
}
```

#### Reassign a Task

```json
{
  "action": "reassign",
  "taskId": 1,
  "assignee": "0x9876...5432"
}
```

### Inspect Requests

Send inspect requests using the following routes:

- `list`: List all tasks
- `task/<taskId>`: View details of a specific task (e.g., `task/1`)
- `balance`: Check your token balance
- `my_tasks`: View tasks you're involved in (as creator or assignee)
