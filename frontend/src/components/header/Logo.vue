<template>
  <router-link class="logo" to="/">
    <img alt="" class="logo__img" src="../../assets/tree.png" />
    <span class="logo-text">Zapovednikqwd</span>
  </router-link>
</template>

<style lang="scss" scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: $color-darker;
  text-decoration: none;
  font-weight: 700;
  flex-shrink: 0;
}

.logo__img {
  height: 30px;
  width: auto;
}

.logo-text {
  font-size: 1.15rem;
  letter-spacing: 0.2px;
}
</style>
