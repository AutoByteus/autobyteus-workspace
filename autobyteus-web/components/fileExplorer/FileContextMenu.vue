<template>
  <Teleport to="body">
    <div 
      v-if="visible" 
      ref="menuRef"
      class="fixed bg-gray-50 rounded-lg shadow-lg border border-gray-200 z-[9999] py-2 min-w-[200px] overflow-hidden"
      :style="menuStyle"
    >
      <ul class="text-gray-700">
        <li 
          v-for="(item, index) in menuItems" 
          :key="index"
          class="menu-item flex items-center px-5 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
          @click="item.action"
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
import { ref, computed, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

interface ContextMenuPosition {
  top: number
  left: number
}

interface Props {
  visible: boolean
  position: ContextMenuPosition
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'rename'): void
  (e: 'delete'): void
  (e: 'add-file'): void
  (e: 'add-folder'): void
}>()

const menuRef = ref<HTMLElement | null>(null)

// We build the menu dynamically to conditionally include Preview
const menuItems = computed(() => {
  const items = [] as Array<{ label: string; icon: string; action: () => void }>

  /* Open Preview option removed */

  items.push(
    {
      label: 'Add File',
      icon: 'heroicons:plus',
      action: () => emit('add-file')
    },
    {
      label: 'Add Folder',
      icon: 'heroicons:plus',
      action: () => emit('add-folder')
    },
    {
      label: 'Rename',
      icon: 'heroicons:pencil-square',
      action: () => emit('rename')
    },
    {
      label: 'Delete',
      icon: 'heroicons:trash',
      action: () => emit('delete')
    }
  )

  return items
})

const menuStyle = computed(() => {
  if (!menuRef.value) {
    return {
      top: `${props.position.top}px`,
      left: `${props.position.left}px`,
      opacity: 0
    }
  }

  const menu = menuRef.value
  const menuRect = menu.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  let top = props.position.top
  let left = props.position.left

  // Adjust if menu would go off bottom of screen
  if (top + menuRect.height > windowHeight) {
    top = top - menuRect.height
  }

  // Adjust if menu would go off right of screen
  if (left + menuRect.width > windowWidth) {
    left = left - menuRect.width
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
    opacity: 1
  }
})

watch(() => props.visible, (newVisible) => {
  if (newVisible && menuRef.value) {
    const { top, left } = menuStyle.value
    menuRef.value.style.top = top
    menuRef.value.style.left = left
  }
})

onUnmounted(() => {
  // Clean up if needed
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
