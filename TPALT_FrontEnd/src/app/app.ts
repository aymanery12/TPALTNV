import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatbotComponent } from './shared/components/chatbot/chatbot';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatbotComponent],
  template: `
    <router-outlet></router-outlet>
    <app-chatbot></app-chatbot>
  `
})
export class App implements OnInit {
  constructor(
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.initializeSessionOnAppStart();
  }
}
