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
      :class="{ 'continues-to-sibling': hasFollowingSibling, 'anchor-name-line': anchor === 'name-line' }"
      :data-has-following-sibling="hasFollowingSibling"
      :style="{ left: branchLeft(depth) }"
    />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  depth: number;
  continuingAncestorDepths: number[];
  hasFollowingSibling: boolean;
  /** `name-line`: the elbow meets the first (name) line of a two-line row instead of the row's centre. */
  anchor?: 'center' | 'name-line';
}>(), { anchor: 'center' });

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

/* The name line's centre is 0.875rem below the row top (py-1 + half of h-5); the branch box starts 0.2rem above the row. */
.hierarchy-current-branch.anchor-name-line::after {
  top: 1.075rem;
}

.hierarchy-current-branch.anchor-name-line:not(.continues-to-sibling)::before {
  height: calc(1.075rem + 0.5px);
}
</style>
