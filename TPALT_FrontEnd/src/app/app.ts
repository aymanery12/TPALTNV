import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ChatbotComponent } from './shared/components/chatbot/chatbot';
import { LoaderComponent } from './shared/components/loader/loader';
import { LoadingService } from './core/services/loading.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatbotComponent, LoaderComponent],
  template: `
    <app-loader></app-loader>
    <router-outlet></router-outlet>
    <app-chatbot></app-chatbot>
  `
})
export class App implements OnInit {
  constructor(
    private router: Router,
    private loadingService: LoadingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.clearSessionOnAppStart();

    this.router.events.pipe(
      filter(e =>
        e instanceof NavigationStart ||
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      )
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.show();
      } else {
        this.loadingService.hide();
      }
    });
  }
}
