<template>
  <!-- The one avatar of an agent, team or org (autobyteus-669 W-1): its picture in the slot the caller sized and shaped
       (`class`), else its fallback. The slot's place and size never change with the picture. -->
  <span
    class="inline-flex flex-shrink-0 items-center justify-center overflow-hidden"
    :data-avatar-kind="kind"
    :data-avatar-state="src ? 'picture' : 'fallback'"
    data-test="definition-avatar"
  >
    <img
      v-if="src"
      :key="src"
      :src="src"
      :alt="alt ?? `${name} avatar`"
      class="h-full w-full object-cover"
      data-test="definition-avatar-image"
      @error="onImageError"
    >
    <slot v-else name="fallback">
      <Icon v-if="kind === 'team'" icon="heroicons:user-group-20-solid" :class="iconClass" aria-hidden="true" />
      <Icon v-else-if="kind === 'org'" icon="heroicons:building-office-2-20-solid" :class="iconClass" aria-hidden="true" />
      <span v-else data-test="definition-avatar-initials">{{ shownInitials }}</span>
    </slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useAvatarObjectUrl } from '~/composables/useAvatarObjectUrl';

const props = withDefaults(defineProps<{
  kind: 'agent' | 'team' | 'org';
  name: string;
  /** The definition's `avatarUrl` (the user's picture, else the package's), or null. */
  avatarUrl?: string | null;
  /** The fallback icon's size for a team or org. */
  iconClass?: string;
  /** The fallback initials for an agent; from the name when not given. */
  initials?: string | null;
  alt?: string | null;
}>(), { avatarUrl: null, iconClass: 'h-5 w-5', initials: null, alt: null });

const { src, onError } = useAvatarObjectUrl(() => props.avatarUrl);
/** The picture this `<img>` showed could not be shown; an error of one since replaced changes nothing. */
const onImageError = (event: Event): void => onError((event.target as HTMLImageElement | null)?.getAttribute('src') ?? null);

/** The first letters of the name's first two words, as every agent fallback shows them. */
const shownInitials = computed(() => props.initials || props.name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  .map((word) => word.charAt(0).toUpperCase()).join('') || (props.kind === 'agent' ? 'AG' : props.kind === 'team' ? 'T' : 'AO'));
</script>
