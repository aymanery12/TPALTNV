import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { timeout } from 'rxjs/operators';

interface ChatMessage {
    role: 'user' | 'bot';
    text: string;
}

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
        <button
                (click)="toggleChat()"
                class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-2xl flex items-center justify-center transition-all hover:scale-110"
                title="Assistant BookStore">
            <span class="material-symbols-outlined text-2xl">
                {{ isOpen ? 'close' : 'smart_toy' }}
            </span>
        </button>

        <div *ngIf="isOpen"
             class="fixed bottom-24 right-6 z-50 w-80 md:w-96 h-[520px] flex flex-col bg-[#1a1a2e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

            <div class="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 shrink-0">
                <div class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-xl">smart_toy</span>
                </div>
                <div>
                    <p class="text-white font-bold text-sm">Assistant BookStore</p>
                    <p class="text-white/80 text-xs">Propulsé par Gemini AI</p>
                </div>
                <button (click)="toggleChat()" class="ml-auto text-white/80 hover:text-white">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            <div #messagesContainer class="flex-1 overflow-y-auto p-4 space-y-3">

                <!-- Bienvenue -->
                <div class="flex gap-2">
                    <div class="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                        <span class="material-symbols-outlined text-amber-400 text-sm">smart_toy</span>
                    </div>
                    <div class="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
                        <p class="text-white text-sm">Bonjour ! Je suis votre assistant libraire. Comment puis-je vous aider ?</p>
                    </div>
                </div>

                <!-- Suggestions -->
                <div *ngIf="messages.length === 0" class="flex flex-wrap gap-2 pl-9">
                    <button *ngFor="let s of suggestions"
                            (click)="sendSuggestion(s)"
                            class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full border border-slate-600 transition-colors">
                        {{ s }}
                    </button>
                </div>

                <!-- Messages -->
                <ng-container *ngFor="let msg of messages; let i = index">
                    <div class="flex gap-2" [class.flex-row-reverse]="msg.role === 'user'">

                        <div *ngIf="msg.role === 'bot'"
                             class="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                            <span class="material-symbols-outlined text-amber-400 text-sm">smart_toy</span>
                        </div>

                        <div class="max-w-[85%] px-4 py-3 rounded-2xl text-sm"
                             [ngClass]="{
                                 'bg-slate-800 text-white rounded-tl-none': msg.role === 'bot',
                                 'bg-amber-400 text-slate-900 rounded-tr-none': msg.role === 'user'
                             }">
                            <p style="white-space: pre-wrap">{{ msg.text }}</p>
                        </div>
                    </div>
                </ng-container>

                <!-- Typing indicator -->
                <div *ngIf="isLoading" class="flex gap-2 animate-fade-in">
                    <div class="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                        <span class="material-symbols-outlined text-amber-400 text-sm">smart_toy</span>
                    </div>
                    <div class="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                    </div>
                </div>

                <!-- Non connecté -->
                <div *ngIf="!isLoggedIn"
                     class="bg-amber-900/30 border border-amber-700/50 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
                    <span class="material-symbols-outlined text-base shrink-0">info</span>
                    <span>
                        Vous devez être
                        <a routerLink="/login" (click)="toggleChat()" class="underline font-bold">connecté</a>
                        pour utiliser le chatbot.
                    </span>
                </div>
            </div>

            <div class="border-t border-slate-700 p-3 shrink-0">
                <div class="flex gap-2 items-end">
                    <textarea
                            [(ngModel)]="inputText"
                            (keydown)="onKeydown($event)"
                            [placeholder]="isLoggedIn ? 'Posez votre question...' : 'Connectez-vous pour chatter'"
                            [disabled]="!isLoggedIn || isLoading"
                            rows="1"
                            class="flex-1 bg-slate-800 text-white text-sm rounded-xl px-4 py-2.5 outline-none border border-slate-600 focus:border-amber-400 transition-colors resize-none placeholder-slate-500 disabled:opacity-50"
                            style="max-height:100px; overflow-y:auto">
                    </textarea>
                    <button
                            (click)="send()"
                            [disabled]="!inputText.trim() || !isLoggedIn || isLoading"
                            class="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-colors">
                        <span class="material-symbols-outlined text-slate-900 text-lg">
                            {{ isLoading ? 'hourglass_empty' : 'send' }}
                        </span>
                    </button>
                </div>
                <p class="text-slate-600 text-[10px] mt-1.5 text-center">BookStore AI · Gemini</p>
            </div>
        </div>
    `,
    styleUrl: './chatbot.scss'
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

    isOpen = false;
    isLoggedIn = false;
    isLoading = false;
    inputText = '';
    messages: ChatMessage[] = [];

    suggestions = [
        '📚 Recommande-moi un roman',
        '💻 Livres de programmation',
        '⭐ Les mieux notés',
        '💰 Moins de 20€',
    ];

    // ✅ ChangeDetectorRef injecté pour forcer le re-rendu
    constructor(
        private chatService: ChatService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.authService.isLoggedIn().subscribe(status => {
            console.log('🔐 isLoggedIn =', status);
            this.isLoggedIn = status;
        });
    }

    ngAfterViewChecked(): void {
        try {
            this.messagesContainer.nativeElement.scrollTop =
                this.messagesContainer.nativeElement.scrollHeight;
        } catch {}
    }

    toggleChat(): void { this.isOpen = !this.isOpen; }
    sendSuggestion(text: string): void { this.inputText = text; this.send(); }

    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.send();
        }
    }

    send(): void {
        const text = this.inputText.trim();
        if (!text || !this.isLoggedIn || this.isLoading) return;

        // Ajouter message utilisateur
        this.messages.push({ role: 'user', text });
        this.inputText = '';
        this.isLoading = true;
        this.cdr.detectChanges(); // ✅ forcer affichage du message user

        console.log('📨 Envoi à Gemini:', text);

        this.chatService.ask(text)
            .pipe(timeout(30000))
            .subscribe({
                next: (response) => {
                    console.log('✅ Réponse Gemini:', response);
                    this.messages.push({ role: 'bot', text: response });
                    this.isLoading = false;
                    setTimeout(() => this.cdr.detectChanges(), 0);
                },
                error: (err) => {
                    console.error('❌ Erreur:', err);
                    let msg = "Désolé, une erreur s'est produite.";
                    if (err?.name === 'TimeoutError') msg = "Gemini met trop de temps. Réessayez.";
                    if (err?.status === 401 || err?.status === 403) msg = "Session expirée. Reconnectez-vous.";

                    this.messages.push({ role: 'bot', text: msg });
                    this.isLoading = false;
                    this.cdr.detectChanges(); // ✅ forcer affichage de l'erreur
                }
            });
    }
}