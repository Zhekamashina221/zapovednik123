import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('@/views/HomeView.vue') },
    { path: '/list', component: () => import('@/views/ListView.vue') },
    { path: '/reserve/:id', component: () => import('@/views/ReserveView.vue') },
    { path: '/marshruty', component: () => import('@/views/CuratedRoutesListView.vue') },
    { path: '/marshruty/:slug', component: () => import('@/views/CuratedRouteDetailView.vue') },
    { path: '/login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/verify-email-sent',
      component: () => import('@/views/VerifyEmailSentView.vue'),
    },
    { path: '/verify-email', component: () => import('@/views/VerifyEmailView.vue') },
    { path: '/forgot-password', component: () => import('@/views/ForgotPasswordView.vue') },
    {
      path: '/forgot-password-sent',
      component: () => import('@/views/ForgotPasswordSentView.vue'),
    },
    { path: '/reset-password', component: () => import('@/views/ResetPasswordView.vue') },
    {
      path: '/profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', component: () => import('@/views/AdminDashboardPage.vue') },
        { path: 'reserves', component: () => import('@/views/AdminReservesPage.vue') },
        { path: 'users', component: () => import('@/views/AdminUsersPage.vue') },
        { path: 'reviews', component: () => import('@/views/AdminReviewsPage.vue') },
        { path: 'curated-routes', component: () => import('@/views/AdminCuratedRoutesPage.vue') },
        { path: 'audit-logs', component: () => import('@/views/AdminAuditLogsPage.vue') },
      ],
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.token) {
    return next('/login')
  }

  if (to.meta.requiresAdmin) {
    if (!auth.user && auth.token) {
      try {
        await auth.loadProfile()
      } catch {
        auth.clearSession()
        return next('/login')
      }
    }
    if (auth.user?.role !== 'admin') {
      return next('/')
    }
  }

  return next()
})

export default router
