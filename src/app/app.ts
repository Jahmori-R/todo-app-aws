import { Component, signal, OnInit, OnDestroy } from '@angular/core'; import { RouterOutlet } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { generateClient } from "aws-amplify/data";
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import type { Schema } from "../../amplify/data/resource";
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';

const client = generateClient<Schema>() // used for CRUDL requests
type Todo = Schema['Todo']['type']

@Component({
  imports: [FormsModule, AmplifyAuthenticatorModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})

export class App implements OnInit, OnDestroy {
  todos = signal<Todo[]>([]);
  userEmail = signal<string>('')
  newTask = '';
  private stopHubListener?: () => void;

  async ngOnInit(): Promise<void> {
    this.stopHubListener = Hub.listen('auth', async ({ payload }) => {

      if (payload.event === 'signedIn') {
        await this.syncSessionAndLoad();
      } else if (payload.event === 'signedOut') {
        this.todos.set([]);
        this.userEmail.set('');
      }

    });

    await this.syncSessionAndLoad()
  }

  // Cleans Hub listener
  ngOnDestroy(): void {
    this.stopHubListener?.()
  }

  // Calls the todo records
  async loadTodos(): Promise<void> {
    const { data, errors } = await client.models.Todo.list();
    if (!errors) {
      this.todos.set(data);
    }
  }

  // Handles when users sign out of session
  async handleSignOut(): Promise<void> {
    await signOut()
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

  private async syncSessionAndLoad(): Promise<void> {
    try {
      const user = await getCurrentUser();
      this.userEmail.set(user.signInDetails?.loginId ?? user.username);
      await this.loadTodos();
    } catch {
      // If no user signed in session, sign in form will load
      this.todos.set([]);
      this.userEmail.set('');
    }
  }
}

