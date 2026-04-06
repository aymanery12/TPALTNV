import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { BookService } from '../../../core/services/book.service';
import { OrderService } from '../../../core/services/order.service';
import { Book } from '../../models/book.model';
import { Order } from '../../models/order.model';
import { forkJoin, from, of } from 'rxjs';
import { catchError, concatMap, map, toArray } from 'rxjs/operators';
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
        <!-- Bouton mode sombre (toujours au-dessus du chatbot) -->
        <button
                (click)="themeService.toggle()"
                class="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110"
                [title]="themeService.isDark() ? 'Passer en mode clair' : 'Passer en mode sombre'">
            <span class="material-symbols-outlined text-2xl">
                {{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}
            </span>
        </button>

        <!-- Bouton chatbot -->
        <button
                (click)="toggleChat()"
                class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-2xl flex items-center justify-center transition-all hover:scale-110"
                title="Assistant BookStore">
            <span class="material-symbols-outlined text-2xl">
                {{ isOpen ? 'close' : 'smart_toy' }}
            </span>
        </button>

        <div *ngIf="isOpen"
             class="fixed bottom-[88px] right-6 z-50 w-80 md:w-96 h-[520px] flex flex-col bg-[#1a1a2e] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

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
    lastTopRatedBooks: Book[] = [];
    lastOfferBooks: Book[] = [];
    lastBestSellerBooks: Book[] = [];

    suggestions = [
        '📚 Recommande-moi un roman',
        '💻 Livres de programmation',
        '⭐ Les mieux notés',
        '💰 Moins de 20€',
    ];

    // ✅ ChangeDetectorRef injecté pour forcer le re-rendu
    constructor(
        private chatService: ChatService,
        private bookService: BookService,
        private orderService: OrderService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef,
        public themeService: ThemeService
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

        if (this.isTopRatedRequest(text)) {
            this.handleTopRatedRequest();
            return;
        }

        if (this.isSummaryForTopBooksRequest(text)) {
            this.handleTopBooksSummariesRequest();
            return;
        }

        if (this.isUnderTwentyRequest(text)) {
            this.handleUnderTwentyRequest();
            return;
        }

        if (this.isOffersRequest(text)) {
            this.handleOffersRequest();
            return;
        }

        if (this.isOffersFollowUpRequest(text)) {
            this.handleOffersFollowUpRequest();
            return;
        }

        if (this.isBestSellersRequest(text)) {
            this.handleBestSellersRequest();
            return;
        }

        if (this.isRecommendationFromMyOrdersRequest(text)) {
            this.handleRecommendationFromMyOrdersRequest();
            return;
        }

        if (this.isMyOrdersRequest(text)) {
            this.handleMyOngoingOrdersRequest();
            return;
        }

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

    private isTopRatedRequest(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return normalized.includes('mieux notes') || normalized.includes('top 5') || normalized.includes('top notes');
    }

    private isSummaryForTopBooksRequest(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return normalized.includes('resume pour chaque livre')
            || normalized.includes('resumes pour chaque livre')
            || normalized.includes('resume de chaque livre')
            || normalized.includes('resume pour chacun');
    }

    private isOffersRequest(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return normalized.includes('offre')
            || normalized.includes('offres')
            || normalized.includes('promotion')
            || normalized.includes('promotions')
            || normalized.includes('promo');
    }

    private isUnderTwentyRequest(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return normalized.includes('moins de 20')
            || normalized.includes('< 20')
            || normalized.includes('inferieur a 20')
            || normalized.includes('pas cher')
            || normalized.includes('petit budget');
    }

    private isOffersFollowUpRequest(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return normalized.includes('autre')
            || normalized.includes('d autre')
            || normalized.includes('pas d autre')
            || normalized.includes('il y en a d autres');
    }

    private isBestSellersRequest(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return normalized.includes('plus vendus')
            || normalized.includes('meilleures ventes')
            || normalized.includes('best seller')
            || normalized.includes('best sellers')
            || normalized.includes('best-seller')
            || normalized.includes('best-sellers');
    }

    private isMyOrdersRequest(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (normalized.includes('recommande')) {
            return false;
        }

        return normalized.includes('commande en cours')
            || normalized.includes('commandes en cours')
            || normalized.includes('mes commandes')
            || normalized.includes('j ai des commandes en cours')
            || normalized.includes('jai des commandes en cours');
    }

    private isRecommendationFromMyOrdersRequest(text: string): boolean {
        const normalized = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return normalized.includes('recommande')
            && (normalized.includes('mes commandes') || normalized.includes('commande'));
    }

    private handleTopRatedRequest(): void {
        this.bookService.getBooks()
            .pipe(timeout(15000))
            .subscribe({
                next: (books) => {
                    const topBooks = [...books]
                        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                        .slice(0, 5);

                    this.lastTopRatedBooks = topBooks;

                    const response = this.formatTopRatedResponse(topBooks);
                    this.messages.push({ role: 'bot', text: response });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.messages.push({
                        role: 'bot',
                        text: "Je n'arrive pas a recuperer le top des livres pour le moment."
                    });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    private handleTopBooksSummariesRequest(): void {
        if (!this.lastTopRatedBooks.length) {
            this.messages.push({
                role: 'bot',
                text: "Donnez-moi d'abord la commande 'Les mieux notés' pour que je sache quels 5 livres resumer."
            });
            this.isLoading = false;
            this.cdr.detectChanges();
            return;
        }

        from(this.lastTopRatedBooks)
            .pipe(
                concatMap((book) =>
                    this.chatService.getBookSummary(book.id).pipe(
                        map((summary) => ({ book, summary })),
                        catchError(() => of({ book, summary: 'Resume indisponible pour ce livre.' }))
                    )
                ),
                toArray()
            )
            .subscribe({
                next: (items) => {
                    const lines = items.map((item, index) => (
                        `${index + 1}. ${item.book.title}\n${item.summary}`
                    ));

                    this.messages.push({
                        role: 'bot',
                        text: `Voici un resume pour chacun des 5 livres :\n\n${lines.join('\n\n')}`
                    });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.messages.push({
                        role: 'bot',
                        text: "Impossible de recuperer les resumes pour le moment."
                    });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    private handleUnderTwentyRequest(): void {
        this.bookService.getBooks()
            .pipe(timeout(15000))
            .subscribe({
                next: (books) => {
                    const budgetBooks = [...books]
                        .map((book) => ({
                            book,
                            finalPrice: this.computeFinalPrice(book)
                        }))
                        .filter((item) => item.finalPrice <= 20)
                        .sort((a, b) => a.finalPrice - b.finalPrice)
                        .slice(0, 10);

                    this.messages.push({ role: 'bot', text: this.formatUnderTwentyResponse(budgetBooks) });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.messages.push({
                        role: 'bot',
                        text: "Je n'arrive pas a recuperer les livres petit budget pour le moment."
                    });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    private computeFinalPrice(book: Book): number {
        const basePrice = Number.isFinite(book.price) ? book.price : 0;
        const discount = book.discount ?? 0;
        return discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
    }

    private handleOffersRequest(): void {
        this.bookService.getBooks()
            .pipe(timeout(15000))
            .subscribe({
                next: (books) => {
                    const offerBooks = [...books]
                        .filter((book) => (book.discount ?? 0) > 0)
                        .sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));

                    this.lastOfferBooks = offerBooks;

                    this.messages.push({ role: 'bot', text: this.formatOffersResponse(offerBooks) });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.messages.push({
                        role: 'bot',
                        text: "Je n'arrive pas a verifier les offres en temps reel pour le moment."
                    });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    private handleOffersFollowUpRequest(): void {
        if (!this.lastOfferBooks.length) {
            this.messages.push({
                role: 'bot',
                text: "Je n'ai pas encore verifie les offres. Demandez-moi d'abord les livres en offre."
            });
            this.isLoading = false;
            this.cdr.detectChanges();
            return;
        }

        if (this.lastOfferBooks.length === 1) {
            this.messages.push({
                role: 'bot',
                text: `Non, pour le moment il n'y a qu'un seul livre en offre: ${this.lastOfferBooks[0].title}.`
            });
            this.isLoading = false;
            this.cdr.detectChanges();
            return;
        }

        const others = this.lastOfferBooks.slice(1);
        const lines = others.map((book, index) => {
            const discount = (book.discount ?? 0).toFixed(0);
            const finalPrice = Number.isFinite(book.price)
                ? (book.price * (1 - (book.discount ?? 0) / 100)).toFixed(2)
                : 'N/A';
            return `${index + 1}. ${book.title} - -${discount}% - ${finalPrice}EUR`;
        });

        this.messages.push({
            role: 'bot',
            text: `Oui, voici d'autres livres en offre :\n${lines.join('\n')}`
        });
        this.isLoading = false;
        this.cdr.detectChanges();
    }

    private handleBestSellersRequest(): void {
        this.bookService.getBooks()
            .pipe(timeout(15000))
            .subscribe({
                next: (books) => {
                    const ranked = [...books]
                        .filter((book) => (book.soldCount ?? 0) > 0)
                        .sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0))
                        .slice(0, 5);

                    this.lastBestSellerBooks = ranked;
                    this.messages.push({ role: 'bot', text: this.formatBestSellersResponse(ranked) });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.messages.push({
                        role: 'bot',
                        text: "Je n'arrive pas a recuperer les meilleures ventes en temps reel pour le moment."
                    });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    private handleMyOngoingOrdersRequest(): void {
        if (!this.isLoggedIn) {
            this.messages.push({
                role: 'bot',
                text: 'Vous devez etre connecte pour consulter vos commandes.'
            });
            this.isLoading = false;
            this.cdr.detectChanges();
            return;
        }

        this.orderService.getMyOrders()
            .pipe(timeout(15000))
            .subscribe({
                next: (orders) => {
                    const ongoing = orders.filter((order) => this.isOngoingStatus(order.status));
                    this.messages.push({ role: 'bot', text: this.formatOngoingOrdersResponse(ongoing) });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.messages.push({
                        role: 'bot',
                        text: "Je n'arrive pas a recuperer vos commandes pour le moment."
                    });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }
            });
    }

    private handleRecommendationFromMyOrdersRequest(): void {
        if (!this.isLoggedIn) {
            this.messages.push({
                role: 'bot',
                text: 'Vous devez etre connecte pour obtenir une recommandation basee sur vos commandes.'
            });
            this.isLoading = false;
            this.cdr.detectChanges();
            return;
        }

        forkJoin({
            orders: this.orderService.getMyOrders().pipe(timeout(15000)),
            books: this.bookService.getBooks().pipe(timeout(15000))
        }).subscribe({
            next: ({ orders, books }) => {
                const recommendation = this.computeRecommendationFromOrders(orders, books);
                if (!recommendation) {
                    this.messages.push({
                        role: 'bot',
                        text: "Je n'ai pas assez d'historique d'achat pour recommander un livre pertinent pour le moment."
                    });
                    this.isLoading = false;
                    this.cdr.detectChanges();
                    return;
                }

                const purchasedTitles = orders
                    .flatMap((order) => order.items ?? [])
                    .map((item) => item.book?.title)
                    .filter((title): title is string => !!title)
                    .slice(0, 8);

                const prompt = [
                    'Tu es un assistant libraire. Recommande exactement un livre en francais.',
                    `Utilisateur: ${this.authService.getUsername() ?? 'client'}.`,
                    `Livres deja commandes: ${purchasedTitles.join(', ') || 'aucun'}.`,
                    `Livre recommande (donnees reelles): ${recommendation.title}.`,
                    `Categorie: ${recommendation.category}.`,
                    `Note: ${(recommendation.rating ?? 0).toFixed(1)}/5.`,
                    'Reponds en 2 phrases maximum et explique pourquoi ce livre est coherent avec ses commandes.'
                ].join(' ');

                this.chatService.ask(prompt)
                    .pipe(timeout(15000))
                    .subscribe({
                        next: (aiText) => {
                            this.messages.push({ role: 'bot', text: aiText });
                            this.isLoading = false;
                            this.cdr.detectChanges();
                        },
                        error: () => {
                            this.messages.push({
                                role: 'bot',
                                text: `Je vous recommande ${recommendation.title} (${(recommendation.rating ?? 0).toFixed(1)}/5), car ce choix correspond a vos achats recents.`
                            });
                            this.isLoading = false;
                            this.cdr.detectChanges();
                        }
                    });
            },
            error: () => {
                this.messages.push({
                    role: 'bot',
                    text: "Je n'arrive pas a analyser vos commandes en temps reel pour le moment."
                });
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private computeRecommendationFromOrders(orders: Order[], books: Book[]): Book | null {
        const purchasedIds = new Set<number>();
        const authorWeights = new Map<string, number>();
        const categoryWeights = new Map<string, number>();

        for (const order of orders) {
            for (const item of order.items ?? []) {
                const purchased = item.book;
                if (!purchased) continue;

                purchasedIds.add(purchased.id);
                const qty = Math.max(1, item.quantity ?? 1);

                for (const rawAuthor of purchased.author ?? []) {
                    const author = (rawAuthor ?? '').trim().toLowerCase();
                    if (!author) continue;
                    authorWeights.set(author, (authorWeights.get(author) ?? 0) + qty);
                }

                const category = (purchased.category ?? '').trim().toLowerCase();
                if (category) {
                    categoryWeights.set(category, (categoryWeights.get(category) ?? 0) + qty);
                }
            }
        }

        const candidates = books.filter((book) => !purchasedIds.has(book.id));
        if (!candidates.length) return null;

        const scored = candidates
            .map((book) => ({ book, score: this.getBookAffinityScore(book, authorWeights, categoryWeights) }))
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return (b.book.rating ?? 0) - (a.book.rating ?? 0);
            });

        return scored[0]?.book ?? null;
    }

    private getBookAffinityScore(
        book: Book,
        authorWeights: Map<string, number>,
        categoryWeights: Map<string, number>
    ): number {
        let score = 0;

        for (const rawAuthor of book.author ?? []) {
            const author = (rawAuthor ?? '').trim().toLowerCase();
            if (author && authorWeights.has(author)) {
                score += (authorWeights.get(author) ?? 0) * 4;
            }
        }

        const category = (book.category ?? '').trim().toLowerCase();
        if (category && categoryWeights.has(category)) {
            score += (categoryWeights.get(category) ?? 0) * 2;
        }

        return score;
    }

    private isOngoingStatus(status?: string): boolean {
        return status === 'EN_PREPARATION' || status === 'EXPEDIEE';
    }

    private getOrderStatusLabel(status?: string): string {
        if (status === 'EN_PREPARATION') return 'En preparation';
        if (status === 'EXPEDIEE') return 'Expediee';
        if (status === 'LIVREE') return 'Livree';
        if (status === 'ANNULEE') return 'Annulee';
        return status ?? 'En cours';
    }

    private formatOngoingOrdersResponse(orders: Order[]): string {
        if (!orders.length) {
            return "Vous n'avez pas de commande en cours actuellement.";
        }

        const lines = orders.map((order, index) => {
            const id = order.id ?? '-';
            const status = this.getOrderStatusLabel(order.status);
            const amount = Number.isFinite(order.totalAmount)
                ? `${(order.totalAmount as number).toFixed(2)}EUR`
                : 'Montant indisponible';
            const date = order.orderDate ? new Date(order.orderDate).toLocaleDateString('fr-FR') : 'Date inconnue';
            return `${index + 1}. Commande #${id} - ${status} - ${amount} - ${date}`;
        });

        return `Voici vos commandes en cours :\n${lines.join('\n')}`;
    }

    private formatTopRatedResponse(books: Book[]): string {
        if (!books.length) {
            return 'Aucun livre n\'est disponible pour le moment.';
        }

        const lines = books.map((book, index) => {
            const rating = Number.isFinite(book.rating) ? book.rating.toFixed(1) : '0.0';
            const price = Number.isFinite(book.price) ? `${book.price.toFixed(2)}EUR` : 'N/A';
            return `${index + 1}. ${book.title} - ${rating}/5 - ${price}`;
        });

        return `Voici les 5 livres les mieux notes :\n${lines.join('\n')}`;
    }

    private formatUnderTwentyResponse(entries: Array<{ book: Book; finalPrice: number }>): string {
        if (!entries.length) {
            return 'Aucun livre a moins de 20EUR pour le moment.';
        }

        const lines = entries.map((entry, index) => {
            const discount = entry.book.discount ?? 0;
            const discountLabel = discount > 0 ? ` (-${discount.toFixed(0)}%)` : '';
            return `${index + 1}. ${entry.book.title} - ${entry.finalPrice.toFixed(2)}EUR${discountLabel}`;
        });

        return `Voici des livres a moins de 20EUR en temps reel :\n${lines.join('\n')}`;
    }

    private formatOffersResponse(books: Book[]): string {
        if (!books.length) {
            return 'Aucune offre active pour le moment dans le catalogue en temps reel.';
        }

        const lines = books.map((book, index) => {
            const discount = (book.discount ?? 0).toFixed(0);
            const finalPrice = Number.isFinite(book.price)
                ? (book.price * (1 - (book.discount ?? 0) / 100)).toFixed(2)
                : 'N/A';

            return `${index + 1}. ${book.title} - -${discount}% - ${finalPrice}EUR`;
        });

        return `Oui, il y a ${books.length} livre(s) en offre actuellement :\n${lines.join('\n')}`;
    }

    private formatBestSellersResponse(books: Book[]): string {
        if (!books.length) {
            return 'Aucune donnee de ventes disponible pour le moment.';
        }

        const lines = books.map((book, index) => {
            const sold = book.soldCount ?? 0;
            return `${index + 1}. ${book.title} - ${sold} ventes`;
        });

        return `Voici les livres les plus vendus actuellement :\n${lines.join('\n')}`;
    }
}