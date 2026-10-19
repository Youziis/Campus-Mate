<script setup>
import { ref, watch } from "vue";
const props = defineProps({ modelValue: { type: Array, default: () => [] } });
const emit = defineEmits(["update:modelValue"]);
const text = ref(props.modelValue.join(" "));
const split = (value) => [...new Set(value.trim().split(/\s+/u).filter(Boolean))];
function update(value) {
  text.value = value;
  emit("update:modelValue", split(value));
}
// Preserve spaces during typing and Chinese IME composition; sync only external changes.
watch(() => props.modelValue, (value) => {
  if (JSON.stringify(value) !== JSON.stringify(split(text.value))) text.value = value.join(" ");
}, { deep: true });
</script>

<template>
  <div class="interest-input">
    <el-input :model-value="text" placeholder="例如：羽毛球 摄影 奶龙打卡" @update:model-value="update" />
    <small>自由填写，用空格分隔。最多 30 个标签，每个最多 30 个字符，保存后记录到数据库。</small>
    <div v-if="modelValue.length" class="interest-preview" aria-label="已填写的兴趣标签">
      <span v-for="tag in modelValue" :key="tag">{{ tag }}</span>
    </div>
  </div>
</template>

<style scoped>
.interest-input { width: 100%; }
.interest-input > small { display: block; margin-top: 8px; color: var(--cm-ink-muted); font-size: 12px; line-height: 1.6; }
.interest-preview { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
.interest-preview span { padding: 4px 9px; color: var(--cm-brand); background: var(--cm-surface-muted); border: 1px solid var(--cm-line); border-radius: 6px; font-size: 13px; overflow-wrap: anywhere; max-width: 100%; }
</style>
