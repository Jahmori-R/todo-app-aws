import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
type Todo = Schema['Todo']['type']

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})

export class App implements OnInit {
  todos = signal<Todo[]>([]);
  newTask = '';

  async ngOnInit(): Promise<void> {
    await this.loadTodos();
  }

  async loadTodos(): Promise<void> {
    const { data, errors } = await client.models.Todo.list();
    if (!errors) {
      this.todos.set(data);
    }
  }

  async addTask(): Promise<void> {
    const trimmed = this.newTask.trim();
    if (!trimmed) return;

    const { data: created, errors } = await client.models.Todo.create({
      content: trimmed,
      completed: false,
    });

    if (!errors && created) {
      this.todos.update((list) => [...list, created]);
      this.newTask = '';
    }
  }

  async deleteTask(id: string): Promise<void> {
    const { errors } = await client.models.Todo.delete({ id });
    if (!errors) {
      this.todos.update((list) => list.filter((item) => item.id !== id));
    }
  }

  async toggleTask(item: Todo): Promise<void> {
    const nextCompleted = !item.completed;
    const { data: updated, errors } = await client.models.Todo.update({
      id: item.id,
      completed: nextCompleted,
    });

    if (!errors && updated) {
      this.todos.update((list) =>
        list.map((t) => (t.id === item.id ? updated : t)),
      );
    }
  }
}

