"""HTTP-style handlers for the tracker API.

Each handler takes a plain dict payload (already JSON-decoded) and returns a
plain (body, status) tuple. No web framework dependency; a thin router layer
wires these to real routes elsewhere.
"""

from models.task import Task

_next_id = 1
_store: dict[int, Task] = {}


def create_task(payload: dict) -> tuple[dict, int]:
    """Create a task from {"title": str} and return its serialized form."""
    global _next_id
    title = payload.get("title")
    if not title:
        return {"error": "title is required"}, 400

    task = Task(id=_next_id, title=title)
    _store[task.id] = task
    _next_id += 1
    return task.to_dict(), 201


def list_tasks(_payload: dict) -> tuple[dict, int]:
    """Return all tasks, most recently created first."""
    tasks = sorted(_store.values(), key=lambda t: t.id, reverse=True)
    return {"tasks": [t.to_dict() for t in tasks]}, 200


def get_task(payload: dict) -> tuple[dict, int]:
    """Return a single task by id, or 404 if missing."""
    task_id = payload.get("id")
    task = _store.get(task_id)
    if task is None:
        return {"error": "not found"}, 404
    return task.to_dict(), 200


def update_task(payload: dict) -> tuple[dict, int]:
    """Update a task's title and/or done state."""
    task_id = payload.get("id")
    task = _store.get(task_id)
    if task is None:
        return {"error": "not found"}, 404

    if "title" in payload:
        task.title = payload["title"]
    if "done" in payload:
        task.done = payload["done"]
    return task.to_dict(), 200


def delete_task(payload: dict) -> tuple[dict, int]:
    """Delete a task by id."""
    task_id = payload.get("id")
    if task_id not in _store:
        return {"error": "not found"}, 404
    del _store[task_id]
    return {}, 204
