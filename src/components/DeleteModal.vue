<template>
    <div v-if="modal.deleteConfirm" class="modal-overlay"
         role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
      <div class="modal-card glass-s" style="max-width:400px">
        <h2 class="text-xl font-bold mb-2" id="delete-title">{{ t('confirmDelete') }}</h2>
        <p class="text-sm mb-5" style="color:var(--text3)">{{ t('confirmDeleteDesc') }}</p>
        <div class="flex gap-2 justify-end">
          <button class="btn btn-secondary" @click="modal.deleteConfirm = false">{{ t('cancel') }}</button>
          <button class="btn btn-danger"    @click="confirmDelete">{{ t('deleteBtn') }}</button>
        </div>
      </div>
    </div>

    <!-- Unsaved Changes Alert -->
</template>

<script setup>
defineProps(['show','target','t','icon'])
defineEmits(['confirm','cancel'])
</script>

