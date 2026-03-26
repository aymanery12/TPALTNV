import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth_token');

  // Log de debug pour voir si l'intercepteur fait son travail
  console.log(`🚀 Requête vers : ${req.url}`);
  console.log(`🔑 Token injecté ? : ${token ? 'OUI' : 'NON'}`);

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }

  return next(req);
};