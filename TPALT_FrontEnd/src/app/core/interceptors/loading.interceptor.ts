import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  const shouldSkipLoader =
    req.url.includes('/books/search') ||
    req.url.includes('api-adresse.data.gouv.fr/search');

  if (shouldSkipLoader) {
    return next(req);
  }

  loadingService.show();
  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};