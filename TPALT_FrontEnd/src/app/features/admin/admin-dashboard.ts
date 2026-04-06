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
import { CustomDropdownComponent, DropdownOption } from '../../shared/components/custom-dropdown/custom-dropdown';
import { isCategoryEqual, getUniqueCategoriesFromBooks } from '../../shared/utils/category-utils';

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
    itemsCount?: number;
    items?: { book?: { title: string }; quantity: number; price: number }[];
    trackingNumber?: string;
}

interface StockOverview {
    low: Book[];
    out: Book[];
    movements: StockMovement[];
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
    imports: [CommonModule, RouterModule, DatePipe, FormsModule, CustomDropdownComponent],
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
    publishedYearError = '';

    readonly bookStatusFilterOptions: DropdownOption[] = [
        { value: '', label: 'Tous statuts' },
        { value: 'ACTIVE', label: 'Actif' },
        { value: 'OUT_OF_STOCK', label: 'Rupture' },
        { value: 'DISCONTINUED', label: 'Arrete' },
        { value: 'COMING_SOON', label: 'A paraitre' }
    ];

    readonly orderFilterOptions: DropdownOption[] = [
        { value: '', label: 'Tous les statuts' },
        { value: 'EN_PREPARATION', label: 'En preparation' },
        { value: 'EXPEDIEE', label: 'Expediee' },
        { value: 'LIVREE', label: 'Livree' },
        { value: 'ANNULEE', label: 'Annulee' }
    ];

    readonly orderStatusOptions: DropdownOption[] = [
        { value: 'EN_PREPARATION', label: 'En preparation' },
        { value: 'EXPEDIEE', label: 'Expediee' },
        { value: 'LIVREE', label: 'Livree' },
        { value: 'ANNULEE', label: 'Annulee' }
    ];

    readonly userRoleOptions: DropdownOption[] = [
        { value: 'CLIENT', label: 'Client' },
        { value: 'ADMIN', label: 'Admin' }
    ];

    readonly bookFormStatusOptions: DropdownOption[] = [
        { value: 'ACTIVE', label: 'Actif' },
        { value: 'COMING_SOON', label: 'A paraitre' },
        { value: 'DISCONTINUED', label: 'Arrete' }
    ];

    readonly stockMovementTypeOptions: DropdownOption[] = [
        { value: 'RESTOCK', label: 'Reapprovisionnement' },
        { value: 'RETURN', label: 'Retour client' },
        { value: 'CORRECTION', label: 'Correction manuelle' },
        { value: 'LOSS', label: 'Perte / Casse' }
    ];

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
    private ordersRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    private ordersRetryAttempts = 0;
    private readonly maxOrdersRetryAttempts = 5;

    // ── Utilisateurs ─────────────────────────────────────────────────────────
    users: AppUser[] = [];
    filteredUsers: AppUser[] = [];
    userSearch = '';

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
        this.stopOrdersAutoRefresh();
    }

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    loadView(view: AdminView): void {
        this.activeView = view;
        this.errorMsg = '';
        this.successMsg = '';
        if (view !== 'orders') {
            this.stopOrdersAutoRefresh();
            this.ordersRetryAttempts = 0;
        }
        this.cdr.detectChanges();
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
            next: books => {
                this.books = books;
                this.applyBookFilters();
                this.cdr.detectChanges();
            },
            error: () => {
                this.errorMsg = 'Erreur lors du chargement des livres.';
                this.cdr.detectChanges();
            }
        });
    }

    applyBookFilters(): void {
        this.filteredBooks = this.books.filter(b => {
            const matchSearch = !this.bookSearch ||
                b.title.toLowerCase().includes(this.bookSearch.toLowerCase()) ||
                (b.author || []).join(' ').toLowerCase().includes(this.bookSearch.toLowerCase());
            const matchCat = !this.bookCategoryFilter || isCategoryEqual(b.category, this.bookCategoryFilter);
            const matchStatus = !this.bookStatusFilter || b.status === this.bookStatusFilter;
            return matchSearch && matchCat && matchStatus;
        });
    }

    openAddBook(): void {
        this.editingBook = null;
        this.bookForm = this.emptyBook();
        this.authorInput = '';
        this.publishedYearError = '';
        this.showBookForm = true;
    }

    openEditBook(book: Book): void {
        this.editingBook = book;
        this.bookForm = { ...book };
        this.authorInput = (book.author || []).join(', ');
        this.publishedYearError = '';
        this.showBookForm = true;
    }

    onPublishedYearChange(value: number | string | null): void {
        const year = value === null || value === '' ? null : Number(value);
        this.bookForm.publishedYear = year ?? undefined;

        if (year != null && !Number.isNaN(year) && year > this.currentYear) {
            this.publishedYearError = `L'année doit être inférieure ou égale à ${this.currentYear}.`;
            return;
        }

        this.publishedYearError = '';
    }

    saveBook(): void {
        if (!this.bookForm.title || !this.bookForm.price) {
            this.errorMsg = 'Titre et prix sont obligatoires.';
            return;
        }
        if (this.bookForm.publishedYear != null && this.bookForm.publishedYear > this.currentYear) {
            this.errorMsg = `L'année doit être inférieure ou égale à ${this.currentYear}.`;
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
        return getUniqueCategoriesFromBooks(this.books);
    }

    get categoryFilterOptions(): DropdownOption[] {
        return [
            { value: '', label: 'Toutes categories' },
            ...this.uniqueCategories.map(category => ({ value: category, label: category }))
        ];
    }

    get bookFormCategoryOptions(): DropdownOption[] {
        return [
            { value: '', label: 'Sélectionner une catégorie' },
            ...this.uniqueCategories.map(category => ({ value: category, label: category }))
        ];
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

        this.http.get<StockOverview>(`${this.base}/stock/overview`, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$), catchError(() => of({ low: [], out: [], movements: [] } as StockOverview)))
            .subscribe({
            next: ({ low, out, movements }) => {
                this.lowStockBooks = low;
                this.outOfStockBooks = out;
                this.stockMovements = movements;
                this.cdr.detectChanges();
            },
            error: () => {
                this.errorMsg = 'Erreur lors du chargement du stock.';
                this.cdr.detectChanges();
            }
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
            next: orders => {
                this.orders = orders;
                this.cdr.detectChanges();

                if (orders.length > 0) {
                    this.ordersRetryAttempts = 0;
                    this.stopOrdersAutoRefresh();
                    return;
                }

                if (this.ordersRetryAttempts < this.maxOrdersRetryAttempts) {
                    this.startOrdersAutoRefresh();
                } else {
                    this.stopOrdersAutoRefresh();
                }
            },
            error: () => {
                this.stopOrdersAutoRefresh();
                this.errorMsg = 'Erreur lors du chargement des commandes.';
                this.cdr.detectChanges();
            }
        });
    }

    private startOrdersAutoRefresh(): void {
        this.stopOrdersAutoRefresh();
        this.ordersRefreshTimer = setTimeout(() => {
            if (this.activeView !== 'orders') {
                this.stopOrdersAutoRefresh();
                return;
            }

            this.ordersRetryAttempts += 1;
            if (this.ordersRetryAttempts > this.maxOrdersRetryAttempts) {
                this.stopOrdersAutoRefresh();
                return;
            }

            this.loadOrders();
        }, 900);
    }

    private stopOrdersAutoRefresh(): void {
        if (this.ordersRefreshTimer) {
            clearTimeout(this.ordersRefreshTimer);
            this.ordersRefreshTimer = null;
        }
    }

    updateOrderStatus(order: Order, status: string): void {
        this.http.patch<{ orderId: number; status: string; trackingNumber?: string }>(
            `${this.base}/orders/${order.id}/status`,
            { status }, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                order.status = status;
                if (res.trackingNumber) order.trackingNumber = res.trackingNumber;
                this.successMsg = status === 'EXPEDIEE' && res.trackingNumber
                    ? `Statut mis à jour — N° suivi : ${res.trackingNumber}`
                    : 'Statut mis à jour.';
                this.cdr.detectChanges();
            },
            error: () => { this.errorMsg = 'Erreur lors de la mise à jour.'; this.cdr.detectChanges(); }
        });
    }

    regenerateTracking(order: Order): void {
        this.http.patch<{ orderId: number; trackingNumber: string }>(
            `${this.base}/orders/${order.id}/tracking`,
            {}, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                order.trackingNumber = res.trackingNumber;
                this.successMsg = `Numéro de suivi régénéré : ${res.trackingNumber}`;
                this.cdr.detectChanges();
            },
            error: () => { this.errorMsg = 'Erreur lors de la génération du suivi.'; this.cdr.detectChanges(); }
        });
    }

    chronopostUrl(trackingNumber: string): string {
        return `https://www.chronopost.fr/tracking-no-redux/track?listeNumerosLT=${trackingNumber}`;
    }

    viewOrder(order: Order): void {
        this.http.get<Order>(`${this.base}/orders/${order.id}`, { headers: this.headers() })
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of(order))
            )
            .subscribe(fullOrder => {
                this.selectedOrder = fullOrder;
                this.showOrderModal = true;
            });
    }

    // ── UTILISATEURS ──────────────────────────────────────────────────────────
    loadUsers(): void {

        this.http.get<AppUser[]>(`${this.base}/users`, { headers: this.headers() })
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: users => {
                this.users = users;
                this.applyUserFilters();
                this.cdr.detectChanges();
            },
            error: () => {
                this.errorMsg = 'Erreur lors du chargement des utilisateurs.';
                this.cdr.detectChanges();
            }
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

    applyUserFilters(): void {
        const query = this.userSearch.trim().toLowerCase();
        if (!query) {
            this.filteredUsers = [...this.users];
            return;
        }

        this.filteredUsers = this.users.filter(user => {
            const role = (user.role ?? '').toLowerCase();
            const username = (user.username ?? '').toLowerCase();
            const email = (user.email ?? '').toLowerCase();
            return username.includes(query) || email.includes(query) || role.includes(query);
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

    // ── EXPORT ────────────────────────────────────────────────────────────────

    exportCsv(): void {
        let rows: string[][] = [];
        let filename = 'export';

        switch (this.activeView) {
            case 'books':
            case 'promotions':
                filename = 'livres';
                rows = [
                    ['ID','Titre','Auteurs','Catégorie','Prix (€)','Prix final (€)','Stock','Alerte stock','Statut','Note','Vendus','En avant','Remise (%)','ISBN'],
                    ...this.filteredBooks.map(b => [
                        String(b.id), b.title,
                        (b.author || []).join(' / '),
                        b.category, String(b.price),
                        String(b.discount > 0 ? (b.price * (1 - b.discount / 100)).toFixed(2) : b.price),
                        String(b.quantity), String(b.stockAlert ?? ''),
                        b.status, String(b.rating), String(b.soldCount),
                        b.featured ? 'Oui' : 'Non',
                        String(b.discount ?? 0), b.isbn ?? ''
                    ])
                ];
                break;
            case 'orders':
                filename = 'commandes';
                rows = [
                    ['ID','Client','Date','Total (€)','Statut','Adresse','Paiement'],
                    ...this.orders.map(o => [
                        String(o.id),
                        o.user?.username ?? o.username ?? '',
                        o.orderDate ? new Date(o.orderDate).toLocaleString('fr-FR') : '',
                        String(o.totalAmount),
                        o.status,
                        (o.shippingAddress ?? '').replace(/\n/g, ' '),
                        o.paymentMethod ?? ''
                    ])
                ];
                break;
            case 'stock':
                filename = 'mouvements_stock';
                rows = [
                    ['ID','Date','Livre','Type','Quantité','Stock avant','Stock après','Raison','Admin'],
                    ...this.stockMovements.map(m => [
                        String(m.id),
                        m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : '',
                        m.book?.title ?? '',
                        this.getMovementLabel(m.type),
                        String(m.quantity),
                        String(m.stockBefore),
                        String(m.stockAfter),
                        m.reason ?? '',
                        m.performedBy ?? ''
                    ])
                ];
                break;
            case 'users':
                filename = 'utilisateurs';
                rows = [
                    ['ID','Username','Email','Rôle'],
                    ...this.users.map(u => [
                        String(u.id), u.username, u.email, u.role
                    ])
                ];
                break;
            default:
                return;
        }

        const csv = rows.map(r => r.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportPdf(): void {
        let title = 'Export';
        let headers: string[] = [];
        let rows: string[][] = [];

        switch (this.activeView) {
            case 'books':
            case 'promotions':
                title = 'Catalogue des livres';
                headers = ['ID','Titre','Catégorie','Prix','Stock','Statut','Note'];
                rows = this.filteredBooks.map(b => [
                    String(b.id), b.title, b.category,
                    `${b.price.toFixed(2)} €`, String(b.quantity),
                    this.getBookStatusLabel(b.status), String(b.rating)
                ]);
                break;
            case 'orders':
                title = 'Liste des commandes';
                headers = ['ID','Client','Date','Total','Statut','Adresse'];
                rows = this.orders.map(o => [
                    String(o.id),
                    o.user?.username ?? o.username ?? '',
                    o.orderDate ? new Date(o.orderDate).toLocaleDateString('fr-FR') : '',
                    `${o.totalAmount.toFixed(2)} €`,
                    o.status,
                    (o.shippingAddress ?? '').replace(/\n/g, ' ')
                ]);
                break;
            case 'stock':
                title = 'Mouvements de stock';
                headers = ['Date','Livre','Type','Qté','Avant','Après','Raison'];
                rows = this.stockMovements.map(m => [
                    m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : '',
                    m.book?.title ?? '',
                    this.getMovementLabel(m.type),
                    String(m.quantity),
                    String(m.stockBefore),
                    String(m.stockAfter),
                    m.reason ?? ''
                ]);
                break;
            case 'users':
                title = 'Liste des utilisateurs';
                headers = ['ID','Username','Email','Rôle'];
                rows = this.users.map(u => [String(u.id), u.username, u.email, u.role]);
                break;
            default:
                return;
        }

        const date = new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
        const thHtml = headers.map(h => `<th>${h}</th>`).join('');
        const rowsHtml = rows.map(r =>
            `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`
        ).join('');

        const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 12px; }
  .header h1 { font-size: 18px; font-weight: bold; color: #0f172a; }
  .header .meta { font-size: 11px; color: #64748b; text-align: right; }
  .store { font-size: 13px; font-weight: bold; color: #f59e0b; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e293b; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 16px; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<div class="header">
  <div><div class="store">BookStore Admin</div><h1>${title}</h1></div>
  <div class="meta">Exporté le ${date}<br>Total : ${rows.length} ligne(s)</div>
</div>
<table><thead><tr>${thHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="footer">BookStore — Document généré automatiquement</div>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`;

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    }

    get canExport(): boolean {
        return ['books','promotions','orders','stock','users'].includes(this.activeView);
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
        const map: Record<string, string> = {
            EN_PREPARATION: 'En préparation',
            EXPEDIEE:       'Expédiée',
            LIVREE:         'Livrée',
            ANNULEE:        'Annulée',
            LIVRAISON:      'Expédiée',
        };
        return map[s] ?? s;
    }
    getStatusClass(s: string): string {
        const map: Record<string, string> = {
            EN_PREPARATION: 'preparing',
            EXPEDIEE:       'shipping',
            LIVREE:         'delivered',
            ANNULEE:        'cancelled',
            LIVRAISON:      'shipping',
        };
        return map[s] ?? '';
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
    getSignedMovementQuantity(mv: StockMovement): number {
        const qty = Math.abs(Number(mv?.quantity ?? 0));
        const type = (mv?.type ?? '').toUpperCase();

        if (type === 'SALE' || type === 'LOSS') return -qty;
        if (type === 'RESTOCK' || type === 'RETURN' || type === 'INITIAL') return qty;
        return Number(mv?.quantity ?? 0);
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