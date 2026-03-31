<template>
  <div class="container mx-auto p-4 pt-8">
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Materials Library</h1>

      <div class="flex items-center space-x-2">
        <button class="btn btn-primary" @click="handleUploadClick">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Upload Material
        </button>
        <input type="file" ref="fileInput" class="hidden" @change="onFileChange" multiple accept=".txt,.pdf,.srt,.vtt,.md" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center p-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="materials.length === 0" class="text-center p-12 bg-base-200 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      <p class="text-lg opacity-60">No materials uploaded yet. Upload text files, PDFs, or subtitles to generate courses.</p>
    </div>

    <div v-else class="overflow-x-auto bg-base-100 rounded-box border border-base-200 shadow">
      <table class="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
            <th>Uploaded At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mat in materials" :key="mat.name" class="hover">
            <td>
              <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <div class="font-bold truncate max-w-md" :title="mat.name">{{ mat.name }}</div>
              </div>
            </td>
            <td>{{ formatSize(mat.size) }}</td>
            <td>{{ new Date(mat.createdAt).toLocaleDateString() }}</td>
            <td>
              <button class="btn btn-ghost btn-xs text-error" @click="removeMaterial(mat.name)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { fetchMaterials, uploadMaterial, deleteMaterial, type Material } from '~/api/material';

definePageMeta({ layout: "default" });

const materials = ref<Material[]>([]);
const loading = ref(true);
const fileInput = ref<HTMLInputElement | null>(null);

const loadMaterials = async () => {
  loading.value = true;
  try {
    const res = await fetchMaterials();
    materials.value = Array.isArray(res) ? res : [];
  } catch (error) {
    toast.error('Failed to load materials');
  } finally {
    loading.value = false;
  }
};

const handleUploadClick = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const toastId = toast.loading('Uploading files...');
  let successCount = 0;

  for (let i = 0; i < input.files.length; i++) {
    const file = input.files[i];

    // Size check (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error(`File ${file.name} is too large (max 20MB)`, { id: toastId });
      continue;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await uploadMaterial(formData);
      successCount++;
    } catch (err) {
      toast.error(`Failed to upload ${file.name}`);
    }
  }

  if (successCount > 0) {
    toast.success(`Successfully uploaded ${successCount} file(s)`, { id: toastId });
    await loadMaterials();
  } else {
    toast.dismiss(toastId);
  }

  input.value = ''; // Reset input
};

const removeMaterial = async (name: string) => {
  if (!confirm(`Are you sure you want to delete ${name}?`)) return;

  try {
    await deleteMaterial(name);
    toast.success('Material deleted');
    await loadMaterials();
  } catch (error) {
    toast.error('Failed to delete material');
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

onMounted(() => {
  loadMaterials();
});
</script>
