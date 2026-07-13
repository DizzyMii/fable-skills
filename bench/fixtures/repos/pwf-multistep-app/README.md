# Tracker API

A minimal in-memory task tracker. The `Task` model lives in
`models/task.py`; request handlers live in `api/handlers.py`.

## Endpoints

### Create a task

Request:

```json
{"title": "Write the quarterly report"}
```

Response (201):

```json
{"id": 1, "title": "Write the quarterly report", "done": false}
```

### List tasks

Response (200):

```json
{"tasks": [{"id": 1, "title": "Write the quarterly report", "done": false}]}
```

### Get a task

Request: `{"id": 1}`

Response (200): same shape as create.

### Update a task

Request:

```json
{"id": 1, "title": "Write and send the quarterly report", "done": true}
```

Response (200): the updated task.

### Delete a task

Request: `{"id": 1}`

Response: 204, no body.
