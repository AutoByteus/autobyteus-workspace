<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="fixed bg-gray-50 rounded-lg shadow-lg border border-gray-200 z-[9999] py-2 min-w-[200px] overflow-hidden"
      :style="menuStyle"
      @click.stop
      @contextmenu.prevent.stop
    >
      <ul class="text-gray-700">
        <li
          v-for="item in items"
          :key="item.id"
          class="menu-item flex items-center px-5 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
          @click.stop="emit('select', item.id)"
        >
          <Icon
            :icon="item.icon"
            class="w-5 h-5 mr-3 text-gray-500"
          />
          <span>{{ item.label }}</span>
        </li>
      </ul>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type {
  FileExplorerContextActionId,
  FileExplorerContextMenuItem,
  FileExplorerContextMenuPosition,
} from '~/utils/fileExplorer/contextMenu'

interface Props {
  visible: boolean
  position: FileExplorerContextMenuPosition
  items: FileExplorerContextMenuItem[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'select', actionId: FileExplorerContextActionId): void
}>()

const menuRef = ref<HTMLElement | null>(null)

const menuStyle = computed(() => {
  if (!menuRef.value) {
    return {
      top: `${props.position.top}px`,
      left: `${props.position.left}px`,
      opacity: 0,
    }
  }

  const menu = menuRef.value
  const menuRect = menu.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  let top = props.position.top
  let left = props.position.left

  if (top + menuRect.height > windowHeight) {
    top = top - menuRect.height
  }

  if (left + menuRect.width > windowWidth) {
    left = left - menuRect.width
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
    opacity: 1,
  }
})

watch(() => props.visible, (newVisible) => {
  if (newVisible && menuRef.value) {
    const { top, left } = menuStyle.value
    menuRef.value.style.top = top
    menuRef.value.style.left = left
  }
})
</script>

<style scoped>
.fixed {
  position: fixed;
  opacity: 0;
  transform-origin: top left;
  animation: menuAppear 0.1s ease forwards;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.menu-item {
  user-select: none;
}

@keyframes menuAppear {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
