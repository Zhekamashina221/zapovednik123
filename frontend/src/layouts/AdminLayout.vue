<template>
  <div class="admin-layout container">
    <aside class="admin-sidebar">
      <h2 class="admin-title">Админка</h2>
      <nav class="admin-nav">
        <router-link to="/admin/dashboard">Дашборд</router-link>
        <router-link to="/admin/reserves">Объекты</router-link>
        <router-link to="/admin/users">Пользователи</router-link>
        <router-link to="/admin/reviews">Модерация отзывов</router-link>
        <router-link to="/admin/curated-routes">Готовые маршруты</router-link>
        <router-link to="/admin/audit-logs">Аудит-логи</router-link>
      </nav>
    </aside>

    <section class="admin-content">
      <router-view />
    </section>
  </div>
</template>

<style scoped lang="scss">
.admin-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  padding-top: 20px;
  padding-bottom: 24px;
}

.admin-sidebar {
  border: 1px solid #eaecf0;
  border-radius: 12px;
  padding: 16px;
  height: fit-content;
  position: sticky;
  top: calc($header-height + 16px);
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}

.admin-title {
  margin: 0 0 12px;
  color: #2e8b57;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;

  a {
    text-decoration: none;
    color: #344054;
    font-weight: 600;
    padding: 10px 12px;
    border-radius: 8px;
  }

  .router-link-active {
    background: #e6f7ee;
    color: #1f6b42;
  }
}

.admin-content {
  min-width: 0;
}

@media (max-width: 900px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    position: static;
  }
}
</style>
