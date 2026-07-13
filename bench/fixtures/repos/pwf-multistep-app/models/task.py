"""Task model for the tracker API."""

from dataclasses import dataclass


@dataclass
class Task:
    """A single to-do item."""

    id: int
    title: str
    done: bool = False

    def to_dict(self) -> dict:
        """Serialize the task for API responses."""
        return {
            "id": self.id,
            "title": self.title,
            "done": self.done,
        }
