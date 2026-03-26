package com.bookstore.repository;

import com.bookstore.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {

    // Recherche par catégorie
    List<Book> findByCategory(String category);

    // Recherche full-text par mot-clé dans titre ou description
    @Query("SELECT b FROM Book b WHERE " +
            "(:keyword IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(b.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
            "(:category IS NULL OR b.category = :category) AND " +
            "(:status IS NULL OR b.status = :status)")
    List<Book> searchBooks(
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("status") Book.BookStatus status
    );

    // Recherche simple par mot-clé (utilisée par BookController)
    @Query("SELECT b FROM Book b WHERE LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(b.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Book> searchByKeyword(@Param("keyword") String keyword);

    // Livres en stock critique (quantity <= stockAlert)
    @Query("SELECT b FROM Book b WHERE b.quantity <= b.stockAlert AND b.quantity > 0")
    List<Book> findLowStockBooks();

    // Livres en rupture de stock
    @Query("SELECT b FROM Book b WHERE b.quantity = 0")
    List<Book> findOutOfStockBooks();

    // Valeur totale du stock (sum of price * quantity)
    @Query("SELECT SUM(b.price * b.quantity) FROM Book b WHERE b.quantity > 0")
    Double getTotalStockValue();

    // Stats par catégorie : [category, bookCount, stockCount]
    @Query("SELECT b.category, COUNT(b), SUM(b.quantity) FROM Book b GROUP BY b.category")
    List<Object[]> getCategoryStats();

    // Incrémenter le stock d'un livre
    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.quantity = b.quantity + :qty WHERE b.id = :bookId")
    void incrementStock(@Param("bookId") Long bookId, @Param("qty") int qty);

    // Décrémenter le stock d'un livre
    @Modifying
    @Transactional
    @Query("UPDATE Book b SET b.quantity = b.quantity - :qty WHERE b.id = :bookId AND b.quantity >= :qty")
    int decrementStock(@Param("bookId") Long bookId, @Param("qty") int qty);

    @Query("SELECT b FROM Book b ORDER BY b.soldCount DESC")
    List<Book> findTop10ByOrderBySoldCountDesc();
}