<script setup>
import { useCampus } from "../../stores/campus";
const store = useCampus();
</script>
<template>
  <el-dialog
    v-model="store.showAuth.value"
    width="430"
    class="auth-dialog"
    :show-close="true"
  >
    <div class="dialog-heading">
      <span class="brand-mark large"><i></i><i></i><i></i></span>
      <div class="eyebrow">加入校园同路人</div>
      <h2>{{ store.authMode.value === "login" ? "欢迎回来" : "创建账号" }}</h2>
      <p>登录后可以报名、收藏并获得兴趣推荐。</p>
    </div>

    <el-form class="auth-form" @submit.prevent="store.login">
      <el-form-item v-if="store.authMode.value === 'register'">
        <el-input
          v-model="store.authForm.value.name"
          placeholder="你的昵称"
          aria-label="你的昵称"
          autocomplete="nickname"
          size="large"
        />
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="store.authForm.value.email"
          placeholder="校园邮箱"
          aria-label="校园邮箱"
          autocomplete="username"
          inputmode="email"
          size="large"
        />
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="store.authForm.value.password"
          type="password"
          show-password
          placeholder="密码（至少 8 位）"
          aria-label="密码"
          :autocomplete="store.authMode.value === 'login' ? 'current-password' : 'new-password'"
          size="large"
          @keyup.enter="store.login"
        />
      </el-form-item>
      <el-button
        type="primary"
        size="large"
        class="full-btn"
        :loading="store.busy.value"
        @click="store.login"
      >
        {{ store.authMode.value === "login" ? "登录" : "创建账号" }}
      </el-button>
    </el-form>

    <p class="switch-auth">
      {{ store.authMode.value === "login" ? "还没有账号？" : "已经有账号？" }}
      <button
        @click="store.authMode.value = store.authMode.value === 'login' ? 'register' : 'login'"
      >
        {{ store.authMode.value === "login" ? "立即注册" : "去登录" }}
      </button>
    </p>
    <div v-if="store.authMode.value === 'login'" class="demo-tip">
      演示账号：alice@campus.test / mate1234
    </div>
  </el-dialog>
</template>

<style src="../../styles/components/dialogs.css"></style>

<style scoped>
/* 只让外壳绘制边框，保证普通、悬停和焦点状态的尺寸完全相同。 */
.auth-form {
  --auth-input-height: 48px;
  --auth-input-radius: var(--cm-radius-sm);
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.auth-form :deep(.el-input) {
  width: 100%;
  min-width: 0;
  border-radius: var(--auth-input-radius);
}

.auth-form :deep(.el-input__wrapper) {
  min-height: var(--auth-input-height);
  padding: 0 14px;
  border: 1px solid var(--cm-line);
  border-radius: var(--auth-input-radius);
  background: var(--cm-surface);
  box-shadow: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.auth-form :deep(.el-input__wrapper:hover) {
  border-color: var(--cm-brand);
}

.auth-form :deep(.el-input__wrapper.is-focus),
.auth-form :deep(.el-input__wrapper:focus-within) {
  border-color: var(--cm-brand);
  box-shadow: 0 0 0 3px var(--cm-surface-muted);
}

/* 原生 input 与 wrapper 分工明确，避免 tabindex 全局规则画出第二层方框。 */
.auth-form :deep(.el-input__inner) {
  min-width: 0;
  height: calc(var(--auth-input-height) - 2px);
  padding: 0;
  border: 0;
  border-radius: calc(var(--auth-input-radius) - 1px);
  outline: none;
  background: transparent;
  box-shadow: none;
  color: var(--cm-ink);
}

.auth-form :deep(.el-input__inner:focus-visible),
.auth-form :deep(.el-input__wrapper:focus-visible) {
  outline: none;
}

/* Edge/Chrome 自动填充的背景也使用相同的表面色，避免内部出现矩形色块。 */
.auth-form :deep(.el-input__inner:autofill) {
  box-shadow: 0 0 0 1000px var(--cm-surface) inset;
}

.auth-form :deep(.el-input__inner:-webkit-autofill) {
  -webkit-text-fill-color: var(--cm-ink);
  -webkit-box-shadow: 0 0 0 1000px var(--cm-surface) inset;
}

.auth-form :deep(.el-input__password) {
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .auth-form :deep(.el-input__wrapper) {
    transition: none;
  }
}
</style>
