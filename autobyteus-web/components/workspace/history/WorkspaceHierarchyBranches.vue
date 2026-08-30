<template>
  <span
    class="hierarchy-branches pointer-events-none absolute inset-0"
    data-test="workspace-hierarchy-branches"
    aria-hidden="true"
  >
    <span
      v-for="ancestorDepth in continuingAncestorDepths"
      :key="ancestorDepth"
      class="hierarchy-ancestor-rail absolute bottom-[-0.2rem] top-[-0.2rem] w-px bg-slate-300"
      :data-ancestor-depth="ancestorDepth"
      :style="{ left: branchLeft(ancestorDepth) }"
    />
    <span
      class="hierarchy-current-branch absolute bottom-[-0.2rem] top-[-0.2rem]"
      :class="{ 'continues-to-sibling': hasFollowingSibling }"
      :data-has-following-sibling="hasFollowingSibling"
      :style="{ left: branchLeft(depth) }"
    />
  </span>
</template>

<script setup lang="ts">
defineProps<{
  depth: number;
  continuingAncestorDepths: number[];
  hasFollowingSibling: boolean;
}>();

const branchLeft = (depth: number): string =>
  `calc((${depth} + 1) * 0.875rem - 1px)`;
</script>

<style scoped>
.hierarchy-branches {
  z-index: 1;
}

.hierarchy-current-branch {
  width: 0.5rem;
}

.hierarchy-current-branch::before,
.hierarchy-current-branch::after {
  position: absolute;
  background: #94a3b8;
  content: '';
}

.hierarchy-current-branch::before {
  top: 0;
  left: 0;
  width: 1px;
  height: calc(50% + 0.5px);
}

.hierarchy-current-branch.continues-to-sibling::before {
  height: 100%;
}

.hierarchy-current-branch::after {
  top: 50%;
  left: 0;
  width: 0.5rem;
  height: 1px;
}
</style>
