<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useCampus } from "../stores/campus";
import Live2DAvatar from "./Live2DAvatar.vue";

const props = defineProps({
  activity: { type: Object, default: null },
  featured: { type: Boolean, default: false },
  hideLauncher: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const store = useCampus();
const open = ref(props.hideLauncher);
const composerOpen = ref(false);
const menuOpen = ref(false);
const menuPositions = ref([]);
const timerOpen = ref(false);
const timerMinutes = ref(25);
const timerTask = ref("专注学习");
const activeTask = ref("");
const character = ref(null);
const characterHost = ref(null);
const characterPosition = ref(null);
let dragOrigin;
const characterStyle = computed(() => characterPosition.value ? {
  left: `${characterPosition.value.x}px`, top: `${characterPosition.value.y}px`, bottom: "auto",
} : null);
const flipCharacterUI = computed(() => characterPosition.value && characterPosition.value.x > window.innerWidth / 2);

function constrainPosition(position) {
  const rect = characterHost.value?.getBoundingClientRect();
  return {
    x: Math.max(8, Math.min(position.x, window.innerWidth - (rect?.width || 280) - 8)),
    y: Math.max(88, Math.min(position.y, window.innerHeight - (rect?.height || 420) - 48)),
  };
}
function startCharacterDrag() {
  menuOpen.value = false;
  const rect = characterHost.value.getBoundingClientRect();
  dragOrigin = { x: rect.left, y: rect.top };
}
function moveCharacter({ dx, dy }) {
  if (dragOrigin) characterPosition.value = constrainPosition({ x: dragOrigin.x + dx, y: dragOrigin.y + dy });
}
function saveCharacterPosition() {
  dragOrigin = null;
  if (characterPosition.value) {
    try { localStorage.setItem("cm-character-position", JSON.stringify(characterPosition.value)); } catch {}
  }
}
function resizeCharacter() {
  if (characterPosition.value) characterPosition.value = constrainPosition(characterPosition.value);
}
const composerInput = ref(null);
const latestReply = computed(() => [...messages.value].reverse().find((item) => item.role === "assistant")?.content || "");

async function activateCharacter() {
  composerOpen.value = !composerOpen.value;
  menuOpen.value = false;
  if (composerOpen.value) {
    await nextTick();
    composerInput.value?.focus();
  }
}

function toggleCharacterMenu() {
  if (!menuOpen.value && characterHost.value) {
    const rect = characterHost.value.getBoundingClientRect();
    const compact = window.innerWidth <= 700;
    const size = compact ? 36 : 42;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * .24;
    const gap = 10;
    const columnHeight = size * 5 + gap * 4;
    // Place the column beside the visible figure, inside the transparent canvas margin.
    const leftX = cx - (compact ? 45 : 70) - size - 12;
    const desiredX = leftX >= 8 ? leftX : cx + (compact ? 45 : 70) + 12;
    const x = Math.max(8, Math.min(window.innerWidth - size - 8, desiredX));
    const top = Math.max(88, Math.min(window.innerHeight - columnHeight - 8, cy - size / 2));
    menuPositions.value = Array.from({ length: 5 }, (_, index) => {
      const y = top + index * (size + gap);
      return { left: `${x}px`, top: `${y}px`, '--from-x': `${cx - x - size / 2}px`, '--from-y': `${cy - y - size / 2}px`, animationDelay: `${index * 35}ms` };
    });
  }
  menuOpen.value = !menuOpen.value;
}

function stopTimer() {
  clearInterval(timer);
  seconds.value = 0;
  activeTask.value = "";
}

function scheduleTimer() {
  const minutes = Number(timerMinutes.value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return;
  startTimer(minutes, timerTask.value.trim() || "专注学习");
  timerOpen.value = false;
}
const sessionId = ref(null);
const messages = ref([]);
const draft = ref("");
const sending = ref(false);
const fallback = ref(false);
const errorText = ref("");
const seconds = ref(0);
let timer;

const persona = ref({
  name: "小强",
  rolePrompt: "你是 AI 学习搭子，名字叫小强。你陪用户把一件学习的事弄懂：先讲重点，再出题，也可以一起计时。语气清楚、耐心，回答简短。",
});
const settingsOpen = ref(false);
const historyOpen = ref(false);
const history = ref([]);
const personaForm = ref({ name: persona.value.name, rolePrompt: persona.value.rolePrompt });
const savingPersona = ref(false);
const clock = computed(() => {
  const minutes = String(Math.floor(seconds.value / 60)).padStart(2, "0");
  const rest = String(seconds.value % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
});

async function request(path, body, method = "POST") {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
      ...(store.token.value ? { Authorization: `Bearer ${store.token.value}` } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    store.showAuth.value = true;
    throw Error("请先登录");
  }
  if (!response.ok) throw Error(data.error || "请求失败");
  return data;
}

async function ensureSession() {
  if (!store.token.value) {
    store.showAuth.value = true;
    return false;
  }
  const data = await request("/ai/sessions", { activityId: props.activity?.id || null });
  sessionId.value = data.id;
  messages.value = data.messages || [];
  if (data.persona) persona.value = data.persona;
  return true;
}

function openSettings() {
  historyOpen.value = false;
  personaForm.value = { name: persona.value.name, rolePrompt: persona.value.rolePrompt };
  settingsOpen.value = !settingsOpen.value;
}

async function openHistory() {
  settingsOpen.value = false;
  historyOpen.value = !historyOpen.value;
  if (!historyOpen.value) return;
  try {
    history.value = await request("/ai/sessions", null, "GET");
  } catch (error) {
    errorText.value = error.message;
  }
}

async function loadHistoryItem(item) {
  const data = await request(`/ai/sessions/${item.id}`, null, "GET");
  sessionId.value = data.id;
  messages.value = data.messages || [];
  if (data.persona) persona.value = data.persona;
  historyOpen.value = false;
}

async function startFresh() {
  const data = await request("/ai/sessions", { activityId: props.activity?.id || null, fresh: true });
  sessionId.value = data.id;
  messages.value = [];
  if (data.persona) persona.value = data.persona;
  historyOpen.value = false;
}

async function savePersona(reset = false) {
  savingPersona.value = true;
  errorText.value = "";
  try {
    const data = await request("/ai/persona", reset ? { reset: true } : personaForm.value, "PUT");
    persona.value = data;
    personaForm.value = { name: data.name, rolePrompt: data.rolePrompt };
    if (!reset) settingsOpen.value = false;
  } catch (error) {
    errorText.value = error.message;
  } finally {
    savingPersona.value = false;
  }
}

function closePanel() {
  open.value = false;
  emit("close");
}

async function toggle() {
  open.value = !open.value;
  errorText.value = "";
  if (!open.value || sessionId.value) return;
  try {
    await ensureSession();
  } catch (error) {
    errorText.value = error.message;
  }
}

function startTimer(minutes = 25, task = "专注学习") {
  activeTask.value = task;
  seconds.value = minutes * 60;
  const endsAt = Date.now() + seconds.value * 1000;
  clearInterval(timer);
  timer = setInterval(() => {
    seconds.value = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    if (seconds.value <= 0) {
      clearInterval(timer);
      seconds.value = 0;
      messages.value = [...messages.value, { role: "assistant", content: `「${task}」的 ${minutes} 分钟计时结束了，休息一下吧。` }];
      character.value?.smile();
      return;
    }
  }, 1000);
}

async function send(text) {
  const content = String(text ?? draft.value).trim();
  if (!content || sending.value) return;
  errorText.value = "";
  if (!sessionId.value) {
    try {
      const ready = await ensureSession();
      if (!ready) return;
    } catch (error) {
      errorText.value = error.message;
      return;
    }
  }
  draft.value = "";
  sending.value = true;
  messages.value = [...messages.value, { role: "user", content }];
  if (/25|计时/.test(content)) startTimer();
  try {
    const data = await request(`/ai/sessions/${sessionId.value}/messages`, { content });
    messages.value = data.messages || [];
    fallback.value = !!data.fallback;
  } catch (error) {
    messages.value = messages.value.slice(0, -1);
    draft.value = content;
    errorText.value = error.message;
  } finally {
    sending.value = false;
  }
}

watch(
  () => props.activity?.id || 0,
  () => {
    sessionId.value = null;
    messages.value = [];
    fallback.value = false;
    if (open.value) ensureSession().catch((error) => { errorText.value = error.message; });
  },
);

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("cm-character-position"));
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) characterPosition.value = constrainPosition(saved);
  } catch {}
  window.addEventListener("resize", resizeCharacter);
  // Opening the character is available before login; sending still requires auth.
  if (props.hideLauncher && store.token.value) ensureSession().catch((error) => { errorText.value = error.message; });
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeCharacter);
  clearInterval(timer);
});
</script>

<template>
  <button v-if="!featured && !hideLauncher && !open" class="companion-launcher" type="button" @click="toggle">AI 学习搭子</button>
  <Teleport to="body">
    <section v-if="featured || hideLauncher || open" class="companion-shell" aria-label="AI 学习搭子">
      <div ref="characterHost" class="companion-character" :class="{ 'flip-ui': flipCharacterUI }" :style="characterStyle">
        <Live2DAvatar ref="character" companion-mode @activate="activateCharacter" @menu="toggleCharacterMenu" @dragstart="startCharacterDrag" @dragmove="moveCharacter" @dragend="saveCharacterPosition" />
        <div v-if="!menuOpen && !timerOpen && !settingsOpen && !historyOpen && (sending || latestReply || errorText)" class="companion-bubble" role="status" aria-live="polite">
          <strong>{{ persona.name }}</strong>
          <p>{{ errorText || (sending ? '让我想一想…' : latestReply) }}</p>
        </div>
        <nav v-if="menuOpen" class="companion-menu" aria-label="搭子功能">
          <button :style="menuPositions[0]" type="button" aria-label="定时任务" @click="timerOpen = !timerOpen; settingsOpen = false; historyOpen = false"><span aria-hidden="true">◷</span><small>定时任务</small></button>
          <button :style="menuPositions[1]" type="button" aria-label="对话记录" @click="openHistory(); timerOpen = false"><span aria-hidden="true">↶</span><small>对话记录</small></button>
          <button :style="menuPositions[2]" type="button" aria-label="角色设置" @click="openSettings(); timerOpen = false"><span aria-hidden="true">⚙</span><small>角色设置</small></button>
          <button :style="menuPositions[3]" type="button" aria-label="摸摸头" @click="character?.smile()"><span aria-hidden="true">♡</span><small>摸摸头</small></button>
          <button :style="menuPositions[4]" type="button" aria-label="打个招呼" @click="character?.playReaction()"><span aria-hidden="true">✦</span><small>打个招呼</small></button>
        </nav>
      </div>

      <form v-if="composerOpen" class="companion-composer" @submit.prevent="send()">
        <label for="companion-message">和 {{ persona.name }} 说说话</label>
        <div><input id="companion-message" ref="composerInput" v-model="draft" maxlength="500" placeholder="想学什么，或者想聊点什么？" :disabled="sending" /><button type="submit" :disabled="sending || !draft.trim()">{{ sending ? '思考中…' : '发送 ↑' }}</button><button type="button" aria-label="收起输入框" @click="composerOpen = false">×</button></div>
      </form>

      <section v-if="timerOpen || settingsOpen || historyOpen" class="companion-settings" aria-label="搭子设置">
        <header><h2>{{ timerOpen ? '定时任务' : settingsOpen ? '角色设置' : '对话记录' }}</h2><button type="button" aria-label="关闭设置" @click="timerOpen = false; settingsOpen = false; historyOpen = false">×</button></header>
        <form v-if="timerOpen" @submit.prevent="scheduleTimer">
          <label>任务名称<input v-model="timerTask" maxlength="50" placeholder="例如：复习英语单词" /></label>
          <label>提醒时间（分钟）<input v-model.number="timerMinutes" type="number" min="1" max="180" required /></label>
          <p>保持当前页面和助手开启，结束后由角色提醒。</p>
          <p v-if="seconds">进行中：{{ activeTask }} · {{ clock }}</p>
          <button type="submit">{{ seconds ? '重新开始计时' : '开始计时' }}</button>
          <button v-if="seconds" type="button" @click="stopTimer">取消任务</button>
        </form>
        <form v-if="settingsOpen" @submit.prevent="savePersona(false)">
          <label>角色名字<input v-model="personaForm.name" maxlength="20" required /></label>
          <label>角色设定<textarea v-model="personaForm.rolePrompt" maxlength="800" rows="6" required /></label>
          <button type="submit" :disabled="savingPersona">保存设置</button>
          <button type="button" :disabled="savingPersona" @click="savePersona(true)">恢复默认</button>
        </form>
        <div v-if="historyOpen" class="companion-history">
          <button type="button" @click="startFresh">开始新对话</button>
          <button v-for="item in history" :key="item.id" type="button" @click="loadHistoryItem(item)">{{ item.title }}</button>
          <p v-if="!history.length">还没有历史对话。</p>
        </div>
        <p v-if="errorText" role="alert">{{ errorText }}</p>
      </section>
    </section>
  </Teleport>
</template>

<style scoped>
.companion-launcher { position: fixed; left: 24px; bottom: 24px; z-index: 54; padding: 12px 18px; border: 1px solid var(--cm-line); border-radius: 16px; background: var(--cm-surface); color: var(--cm-brand); cursor: pointer; }
.companion-shell { position: relative; z-index: 54; color: var(--cm-ink); }
.companion-character { position: fixed; left: 12px; bottom: 50px; width: 280px; height: 420px; }
.companion-bubble { position: absolute; left: 195px; bottom: 210px; width: min(330px, calc(100vw - 240px)); padding: 16px 18px; background: var(--cm-surface); border: 1px solid var(--cm-line); border-radius: 20px 20px 20px 3px; box-shadow: 0 12px 40px rgba(40,20,80,.12); }
.companion-bubble strong { display: block; color: var(--cm-brand); font-size: 13px; }
.companion-bubble p { max-height: 240px; overflow-y: auto; margin: 8px 0 0; font-size: 14px; line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; }
.companion-shell button { font: inherit; cursor: pointer; color: var(--cm-brand); border: 1px solid var(--cm-line); background: var(--cm-surface); border-radius: 10px; padding: 8px 12px; }
.companion-shell button:hover { background: var(--cm-surface-muted); }
.companion-shell button:disabled { cursor: wait; opacity: .55; }
.companion-character.flip-ui .companion-bubble { left: auto; right: 195px; border-radius: 20px 20px 3px 20px; }
.companion-composer { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); width: min(600px, calc(100vw - 40px)); padding: 14px 16px; border: 1px solid var(--cm-line); background: var(--cm-surface); border-radius: 20px; box-shadow: 0 16px 60px rgba(40,20,80,.18); }
.companion-composer > label { display: block; margin-bottom: 8px; color: var(--cm-ink-muted); font-size: 12px; }
.companion-composer > div { display: flex; align-items: center; gap: 8px; }
.companion-composer input { flex: 1; min-width: 0; padding: 10px; color: var(--cm-ink); font: inherit; border: 0; background: transparent; }
.companion-composer button[type=submit], .companion-settings button[type=submit] { color: #fff; background: var(--cm-brand); }
.companion-settings { position: fixed; left: 310px; bottom: 140px; width: min(360px, calc(100vw - 32px)); max-height: calc(100dvh - 180px); overflow-y: auto; padding: 20px; background: var(--cm-surface); border: 1px solid var(--cm-line); border-radius: 20px; box-shadow: 0 16px 60px rgba(40,20,80,.18); }
.companion-settings header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.companion-settings h2 { margin: 0; font-size: 20px; }
.companion-settings label { display: grid; gap: 8px; margin-bottom: 16px; font-size: 13px; }
.companion-settings input, .companion-settings textarea { width: 100%; box-sizing: border-box; padding: 10px; font: inherit; color: var(--cm-ink); border: 1px solid var(--cm-line); background: var(--cm-canvas); border-radius: 8px; }
.companion-settings p { font-size: 13px; line-height: 1.6; color: var(--cm-ink-muted); }
.companion-history { display: grid; gap: 8px; }
@media (max-width: 700px) {
 .companion-character { left: 0; bottom: 130px; width: 140px; height: 220px; }
 .companion-bubble { left: 100px; bottom: 130px; width: min(250px, calc(100vw - 140px)); padding: 12px; }
 .companion-composer { bottom: 20px; }
 .companion-settings { left: 16px; bottom: 130px; z-index: 2; }
}

.companion-menu { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
.companion-menu button { position: fixed; display: flex; width: 42px; height: 42px; padding: 0; align-items: center; justify-content: center; border-radius: 50%; pointer-events: auto; box-shadow: 0 6px 18px rgba(40,20,80,.12); animation: companion-orbit-in 320ms cubic-bezier(.22,1,.36,1) both; }
.companion-menu button > span { font-size: 21px; line-height: 1; }
.companion-menu button > small { position: absolute; top: calc(100% + 7px); left: 50%; padding: 5px 8px; color: var(--cm-surface); background: var(--cm-ink); border-radius: 6px; font-size: 12px; font-weight: 500; white-space: nowrap; pointer-events: none; opacity: 0; transform: translate(-50%, -3px); transition: opacity 150ms ease, transform 150ms ease; }
.companion-menu button:hover > small, .companion-menu button:focus-visible > small { opacity: 1; transform: translate(-50%, 0); }
.companion-menu button:hover, .companion-menu button:focus-visible { z-index: 2; }
.companion-menu button:hover { border-color: var(--cm-brand); box-shadow: 0 8px 28px rgba(109,60,235,.22); }
@keyframes companion-orbit-in { from { opacity: 0; transform: translate(var(--from-x),var(--from-y)) scale(.35); } to { opacity: 1; transform: translate(0,0) scale(1); } }
@media (max-width: 700px) { .companion-menu button { width: 36px; height: 36px; } .companion-menu button > span { font-size: 19px; } }
@media (prefers-reduced-motion: reduce) { .companion-menu button { animation: none; } }
</style>
