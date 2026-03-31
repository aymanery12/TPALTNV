import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { environment } from '../../../environments/environment';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdminView =
    | 'dashboard' | 'books' | 'stock' | 'orders' | 'users' | 'promotions';

export interface AdminStats {
    totalProfit: number;
    totalAchats: number;
    totalStock: number;
    totalBooks: number;
    lowStockCount: number;
    outOfStock: number;
    totalStockValue: number;
    enLivraison: number;
    enPreparation: number;
    livrees: number;
    annulees: number;
    totalUsers: number;
    categoryStats: { category: string; bookCount: number; stockCount: number }[];
}

export interface Book {
    id: number;
    title: string;
    author: string[];
    description: string;
    price: number;
    imageUrl: string;
    category: string;
    isbn?: string;
    publisher?: string;
    publishedYear?: number;
    pages?: number;
    language?: string;
    rating: number;
    reviewCount: number;
    quantity: number;
    stockAlert: number;
    soldCount: number;
    status: 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'COMING_SOON';
    featured: boolean;
    discount: number;
    finalPrice?: number;
}

export interface Order {
    id: number;
    user?: { username: string; email?: string };
    username?: string;
    orderDate: string;
    totalAmount: number;
    status: string;
    shippingAddress?: string;
    paymentMethod?: string;
    items?: { book?: { title: string }; quantity: number; price: number }[];
}

export interface AppUser {
    id: number;
    username: string;
    email: string;
    role: string;
    addresses?: string[];
}

export interface StockMovement {
    id: number;
    book?: { id: number; title: string };
    type: string;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    reason?: string;
    performedBy?: string;
    createdAt: string;
}

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, DatePipe, FormsModule],
    templateUrl: './admin-dashboard.html',
    styleUrl: './admin-dashboard.scss'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

    private destroy$ = new Subject<void>();
    private base = `${environment.apiUrl}/admin`;

    // ── Navigation ───────────────────────────────────────────────────────────
    activeView: AdminView = 'dashboard';
    currentYear = new Date().getFullYear();

    errorMsg = '';
    successMsg = '';
    sidebarCollapsed = false;

    // ── Dashboard ────────────────────────────────────────────────────────────
    stats: AdminStats = {
        totalProfit: 0, totalAchats: 0, totalStock: 0, totalBooks: 0,
        lowStockCount: 0, outOfStock: 0, totalStockValue: 0,
        enLivraison: 0, enPreparation: 0, livrees: 0, annulees: 0,
        totalUsers: 0, categoryStats: []
    };
    recentOrders: Order[] = [];
    recentMovements: StockMovement[] = [];
    private chartInstance: any = null;
    private donutInstance: any = null;

    // ── Livres ───────────────────────────────────────────────────────────────
    books: Book[] = [];
    filteredBooks: Book[] = [];
    bookSearch = '';
    bookCategoryFilter = '';
    bookStatusFilter = '';
    showBookForm = false;
    editingBook: Book | null = null;
    bookForm: Partial<Book> = this.emptyBook();
    authorInput = '';   // champ texte libre, converti en string[] à la sauvegarde

    // ── Stock ────────────────────────────────────────────────────────────────
    lowStockBooks: Book[] = [];
    outOfStockBooks: Book[] = [];
    stockMovements: StockMovement[] = [];
    stockAdjustForm: { bookId: number | null; quantity: number; type: string; reason: string } = {
        bookId: null, quantity: 1, type: 'RESTOCK', reason: ''
    };
    showStockModal = false;
    selectedStockBook: Book | null = null;

    // ── Commandes ────────────────────────────────────────────────────────────
    orders: Order[] = [];
    orderFilter = '';
    selectedOrder: Order | null = null;
    showOrderModal = false;

    // ── Utilisateurs ─────────────────────────────────────────────────────────
    users: AppUser[] = [];

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private cdr: ChangeDetectorRef,
        public themeService: ThemeService
    ) {}

    get isDark(): boolean { return this.themeService.isDark(); }
    toggleTheme(): void   { this.themeService.toggle(); }

    ngOnInit(): void {
        this.loadView('dashboard');
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.chartInstance?.destroy();
        this.donutInstance?.destroy();
    }

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    loadView(view: AdminView): void {
        this.activeView = view;
        this.errorMsg = '';
        this.successMsg = '';
        switch (view) {
            case 'dashboard':   this.loadDashboard(); break;
            case 'books':       this.loadBooks(); break;
            case 'stock':       this.loadStock(); break;
            case 'orders':      this.loadOrders(); break;
            case 'users':       this.loadUsers(); break;
            case 'promotions':  this.loadBooks(); break;
        }
    }

    // ── DASHBOARD ─────────────────────────────────────────────────────────────
    loadDashboard(): void {

        forkJoin({
            stats:     this.http.get<AdminStats>(`${this.base}/stats`, { headers: this.headers() }),
            orders:    this.http.get<Order[]>(`${this.base}/orders/recent`, { headers: this.headers() }).pipe(catchError(() => of([] as Order[]))),
            movements: this.http.get<StockMovement[]>(`${this.base}/stock/recent-movements`, { headers: this.headers() }).pipe(catchError(() => of([] as StockMovement[]))),
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: ({ stats, orders, movements }) => {
                this.stats = stats;
                this.recentOrders = orders;
                this.recentMovements = movements;

                this.cdr.detectChanges();
                setTimeout(() => this.initCharts(), 100);
            },
            error: () => {  this.errorMsg = 'Erreur de chargement du dashboard.'; }
        });
    }

    // ── LIVRES ────────────────────────────────────────────────────────────────
    loadBooks(): void {

        this.http.get<Book[]>(`${this.base}/books`, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: books => { this.books = books; this.applyBookFilters();  },
            error: () => {  this.errorMsg = 'Erreur lors du chargement des livres.'; }
        });
    }

    applyBookFilters(): void {
        this.filteredBooks = this.books.filter(b => {
            const matchSearch = !this.bookSearch ||
                b.title.toLowerCase().includes(this.bookSearch.toLowerCase()) ||
                (b.author || []).join(' ').toLowerCase().includes(this.bookSearch.toLowerCase());
            const matchCat = !this.bookCategoryFilter || b.category === this.bookCategoryFilter;
            const matchStatus = !this.bookStatusFilter || b.status === this.bookStatusFilter;
            return matchSearch && matchCat && matchStatus;
        });
    }

    openAddBook(): void {
        this.editingBook = null;
        this.bookForm = this.emptyBook();
        this.authorInput = '';
        this.showBookForm = true;
    }

    openEditBook(book: Book): void {
        this.editingBook = book;
        this.bookForm = { ...book };
        this.authorInput = (book.author || []).join(', ');
        this.showBookForm = true;
    }

    saveBook(): void {
        if (!this.bookForm.title || !this.bookForm.price) {
            this.errorMsg = 'Titre et prix sont obligatoires.';
            return;
        }
        this.bookForm.author = this.authorInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const req = this.editingBook
            ? this.http.put<Book>(`${this.base}/books/${this.editingBook.id}`, this.bookForm, { headers: this.headers() })
            : this.http.post<Book>(`${this.base}/books`, this.bookForm, { headers: this.headers() });

        req.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.showBookForm = false;
                this.successMsg = this.editingBook ? 'Livre modifié !' : 'Livre ajouté !';
                this.loadBooks();
            },
            error: () => { this.errorMsg = 'Erreur lors de la sauvegarde.'; }
        });
    }

    deleteBook(book: Book): void {
        if (!confirm(`Supprimer "${book.title}" ?`)) return;
        this.http.delete(`${this.base}/books/${book.id}`, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: () => { this.successMsg = 'Livre supprimé.'; this.loadBooks(); },
            error: () => { this.errorMsg = 'Erreur lors de la suppression.'; }
        });
    }

    toggleFeatured(book: Book): void {
        this.http.patch<Book>(`${this.base}/books/${book.id}/featured`, {}, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: updated => { book.featured = updated.featured; this.successMsg = 'Mis en avant modifié.'; },
            error: () => { this.errorMsg = 'Erreur.'; }
        });
    }

    setDiscount(book: Book, discount: number): void {
        this.http.patch<Book>(`${this.base}/books/${book.id}/discount`,
            { discount }, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: updated => { book.discount = updated.discount; this.successMsg = 'Remise appliquée.'; },
            error: () => { this.errorMsg = 'Erreur lors de l\'application de la remise.'; }
        });
    }

    get uniqueCategories(): string[] {
        return [...new Set(this.books.map(b => b.category).filter(Boolean))];
    }

    private emptyBook(): Partial<Book> {
        return {
            title: '', author: [], description: '', price: 0, imageUrl: '',
            category: '', isbn: '', publisher: '', publishedYear: new Date().getFullYear(),
            pages: 0, language: 'Français', quantity: 0, stockAlert: 5,
            discount: 0, featured: false, status: 'ACTIVE'
        };
    }

    // ── STOCK ─────────────────────────────────────────────────────────────────
    loadStock(): void {

        forkJoin({
            low:       this.http.get<Book[]>(`${this.base}/stock/low`, { headers: this.headers() }).pipe(catchError(() => of([] as Book[]))),
            out:       this.http.get<Book[]>(`${this.base}/stock/out`, { headers: this.headers() }).pipe(catchError(() => of([] as Book[]))),
            movements: this.http.get<StockMovement[]>(`${this.base}/stock/recent-movements`, { headers: this.headers() }).pipe(catchError(() => of([] as StockMovement[]))),
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: ({ low, out, movements }) => {
                this.lowStockBooks   = low;
                this.outOfStockBooks = out;
                this.stockMovements  = movements;
            },
            error: () => {  this.errorMsg = 'Erreur lors du chargement du stock.'; }
        });
    }

    openStockModal(book: Book): void {
        this.selectedStockBook = book;
        this.stockAdjustForm = { bookId: book.id, quantity: 1, type: 'RESTOCK', reason: '' };
        this.showStockModal = true;
    }

    submitStockAdjustment(): void {
        if (!this.stockAdjustForm.bookId) return;
        this.http.patch(`${this.base}/stock/${this.stockAdjustForm.bookId}/adjust`,
            this.stockAdjustForm, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.showStockModal = false;
                this.successMsg = 'Stock ajusté avec succès.';
                this.loadStock();
            },
            error: () => { this.errorMsg = 'Erreur lors de l\'ajustement du stock.'; }
        });
    }

    // ── COMMANDES ─────────────────────────────────────────────────────────────
    loadOrders(): void {

        const url = this.orderFilter
            ? `${this.base}/orders?status=${this.orderFilter}`
            : `${this.base}/orders`;
        this.http.get<Order[]>(url, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: orders => { this.orders = orders;  },
            error: () => {  this.errorMsg = 'Erreur lors du chargement des commandes.'; }
        });
    }

    updateOrderStatus(order: Order, status: string): void {
        this.http.patch(`${this.base}/orders/${order.id}/status`,
            { status }, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: () => { order.status = status; this.successMsg = 'Statut mis à jour.'; },
            error: () => { this.errorMsg = 'Erreur lors de la mise à jour.'; }
        });
    }

    viewOrder(order: Order): void {
        this.selectedOrder = order;
        this.showOrderModal = true;
    }

    // ── UTILISATEURS ──────────────────────────────────────────────────────────
    loadUsers(): void {

        this.http.get<AppUser[]>(`${this.base}/users`, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: users => { this.users = users;  },
            error: () => {  this.errorMsg = 'Erreur lors du chargement des utilisateurs.'; }
        });
    }

    updateUserRole(user: AppUser, role: string): void {
        this.http.patch(`${this.base}/users/${user.id}/role`,
            { role }, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: () => { user.role = role; this.successMsg = 'Rôle mis à jour.'; },
            error: () => { this.errorMsg = 'Erreur lors de la mise à jour du rôle.'; }
        });
    }

    deleteUser(user: AppUser): void {
        if (!confirm(`Supprimer l'utilisateur "${user.username}" ?`)) return;
        this.http.delete(`${this.base}/users/${user.id}`, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: () => { this.successMsg = 'Utilisateur supprimé.'; this.loadUsers(); },
            error: () => { this.errorMsg = 'Erreur lors de la suppression.'; }
        });
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────
    formatCurrency(v: number): string {
        return (v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    }
    formatNumber(v: number): string {
        return (v || 0).toLocaleString('fr-FR');
    }
    getTodayDate(): string {
        return new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    getStatusLabel(s: string): string {
        return ({ LIVREE: 'Livrée', LIVRAISON: 'En livraison', PREPARATION: 'Préparation', ANNULEE: 'Annulée' } as any)[s] ?? s;
    }
    getStatusClass(s: string): string {
        return ({ LIVREE: 'delivered', LIVRAISON: 'shipping', PREPARATION: 'preparing', ANNULEE: 'cancelled' } as any)[s] ?? '';
    }
    getBookStatusLabel(s: string): string {
        return ({
            ACTIVE: 'Actif', OUT_OF_STOCK: 'Rupture', DISCONTINUED: 'Arrêté', COMING_SOON: 'À paraître'
        } as any)[s] ?? s;
    }
    getBookStatusClass(s: string): string {
        return ({
            ACTIVE: 'active', OUT_OF_STOCK: 'out', DISCONTINUED: 'disc', COMING_SOON: 'soon'
        } as any)[s] ?? '';
    }
    getMovementLabel(t: string): string {
        return ({
            RESTOCK: 'Réappro', SALE: 'Vente', RETURN: 'Retour',
            CORRECTION: 'Correction', LOSS: 'Perte', INITIAL: 'Initial'
        } as any)[t] ?? t;
    }
    getMovementClass(t: string): string {
        return ({
            RESTOCK: 'restock', SALE: 'sale', RETURN: 'return',
            CORRECTION: 'correction', LOSS: 'loss', INITIAL: 'initial'
        } as any)[t] ?? '';
    }
    getStockPct(qty: number, alert: number = 20): number {
        return Math.min(Math.round((qty / Math.max(alert * 4, 20)) * 100), 100);
    }
    getStockColor(qty: number, alert: number = 5): string {
        if (qty === 0) return '#ef4444';
        if (qty <= alert) return '#f59e0b';
        return '#10b981';
    }

    get deliveredCount(): number { return this.recentOrders.filter(o => o.status === 'LIVREE').length; }
    get cancelledCount(): number { return this.recentOrders.filter(o => o.status === 'ANNULEE').length; }

    closeMsg(): void { this.errorMsg = ''; this.successMsg = ''; }

    dismissModal(): void { this.showBookForm = false; this.showStockModal = false; this.showOrderModal = false; }

    // ── CHARTS ────────────────────────────────────────────────────────────────
    private initCharts(): void {
        const Chart = (window as any)['Chart'];
        if (!Chart) return;

        const monthlyData = Array(12).fill(0);
        const monthlyOrders = Array(12).fill(0);
        monthlyData[new Date().getMonth()] = this.stats.totalProfit;

        const revenueCanvas = document.getElementById('revenueChart') as HTMLCanvasElement;
        if (revenueCanvas) {
            this.chartInstance?.destroy();
            this.chartInstance = new Chart(revenueCanvas, {
                type: 'bar',
                data: {
                    labels: ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
                    datasets: [{
                        label: 'Revenus (€)', data: monthlyData,
                        backgroundColor: (ctx: any) => ctx.raw > 0 ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                        borderRadius: 6, borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ctx.raw > 0 ? ctx.raw.toLocaleString('fr-FR') + ' €' : 'À venir' } } },
                    scales: {
                        x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                        y: { ticks: { color: '#64748b', font: { size: 11 }, callback: (v: number) => v === 0 ? '' : (v/1000).toFixed(0) + 'k €' }, grid: { color: 'rgba(255,255,255,0.06)' } }
                    }
                }
            });
        }

        const donutCanvas = document.getElementById('donutChart') as HTMLCanvasElement;
        if (donutCanvas) {
            this.donutInstance?.destroy();
            this.donutInstance = new Chart(donutCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Livrées','En livraison','Préparation','Annulées'],
                    datasets: [{ data: [this.deliveredCount, this.stats.enLivraison, this.stats.enPreparation, this.cancelledCount], backgroundColor: ['#10b981','#3b82f6','#f59e0b','#ef4444'], borderWidth: 0, hoverOffset: 6 }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false } } }
            });
        }
    }
}