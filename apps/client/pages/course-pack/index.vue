<template>
  <div class="flex w-full flex-col p-4">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-3xl dark:border-gray-600">课程包列表</h2>

      <div v-if="isAuthenticated()" class="flex items-center space-x-2">
        <button class="btn btn-primary btn-sm" @click="showCreateModal = true; editingPackId = null; newPack = { title: '', description: '' };">Create Course Pack</button>
        <button class="btn btn-outline btn-sm" @click="handleImportClick">Import Course Pack</button>
        <input type="file" ref="importInput" class="hidden" @change="onImportFile" accept=".json,.zip" />
        <button class="btn btn-secondary btn-sm" @click="showAiGenerateModal = true">AI Generate</button>
      </div>
    </div>
    <template v-if="isLoading">
      <Loading></Loading>
    </template>
    <template v-else>
      <div class="h-[79vh] overflow-y-auto overflow-x-hidden scrollbar-hide">
        <div
          class="grid auto-rows-fr grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-0 md:grid-cols-3 lg:grid-cols-4"
        >
          <template v-for="coursePack in coursePackStore.coursePacks" :key="coursePack.id">
            <CoursePackCard
              :coursePack="{
                id: coursePack.id,
                title: coursePack.title,
                description: coursePack.description,
                cover: coursePack.cover,
                isFree: coursePack.isFree,
              }"
              @cardClick="handleGoToCoursePack"
            >
              <template #actions v-if="isAuthenticated() && (coursePack.creatorId === userStore.user?.id || coursePack.uId === userStore.user?.id)">
                <div class="mt-4 flex justify-end space-x-2 border-t pt-2 dark:border-gray-700" @click.stop>
                  <button class="btn btn-xs btn-outline" @click.stop="openEditModal(coursePack)">Edit</button>
                  <button class="btn btn-xs btn-outline" @click.stop="exportPack(coursePack.id, coursePack.title)">Export</button>
                  <button class="btn btn-xs btn-error btn-outline" @click.stop="removeCoursePack(coursePack.id)">Delete</button>
                </div>
              </template>
            </CoursePackCard>
          </template>
        </div>
      </div>
    </template>

    <!-- Create/Edit Course Pack Modal -->
    <UModal v-model="showCreateModal" :ui="{ width: 'w-full sm:max-w-lg' }">
      <UCard>
        <h3 class="font-bold text-lg mb-4">{{ editingPackId ? 'Edit Course Pack' : 'Create Course Pack' }}</h3>
        <div class="space-y-4">
          <div>
            <label class="label"><span class="label-text">Title</span></label>
            <input v-model="newPack.title" type="text" placeholder="Course Pack Title" class="input input-bordered w-full" />
          </div>
          <div>
            <label class="label"><span class="label-text">Description</span></label>
            <textarea v-model="newPack.description" placeholder="Description" class="textarea textarea-bordered w-full h-24"></textarea>
          </div>
        </div>
        <div class="modal-action mt-4 flex justify-end space-x-2">
          <button class="btn" @click="showCreateModal = false">Cancel</button>
          <button class="btn btn-primary" @click="saveNewPack" :disabled="!newPack.title">Save</button>
        </div>
      </UCard>
    </UModal>

    <!-- AI Generate Modal -->
    <UModal v-model="showAiGenerateModal" :ui="{ width: 'w-full sm:max-w-2xl' }" prevent-close>
      <UCard>
        <h3 class="font-bold text-lg mb-4 text-gray-800 dark:text-white">Generate Course via AI</h3>

        <div v-if="loadingMaterials" class="flex justify-center p-4">
          <span class="loading loading-spinner"></span>
        </div>

        <div v-else-if="availableMaterials.length === 0" class="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span>No materials found. Upload some in the Materials Library first.</span>
        </div>

        <div v-else class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Select Materials</span></label>
            <div class="max-h-48 overflow-y-auto border border-base-300 rounded p-2 bg-base-200">
              <label v-for="mat in availableMaterials" :key="mat.name" class="cursor-pointer label flex justify-start space-x-3">
                <input type="checkbox" :value="mat.name" v-model="selectedMaterials" class="checkbox checkbox-sm" />
                <span class="label-text truncate">{{ mat.name }} ({{ formatSize(mat.size) }})</span>
              </label>
            </div>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Additional Prompt (Optional)</span></label>
            <textarea v-model="aiPrompt" placeholder="E.g., Focus on business English vocabulary..." class="textarea textarea-bordered w-full h-20"></textarea>
          </div>

          <div class="divider">AI Provider Settings</div>

          <div class="form-control">
            <label class="label"><span class="label-text">Provider</span></label>
            <select v-model="aiSettings.provider" class="select select-bordered w-full">
              <option value="openai">OpenAI / Compatible API</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">API Key (Optional if configured on backend)</span></label>
            <input v-model="aiSettings.apiKey" type="password" placeholder="sk-..." class="input input-bordered w-full" />
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Base URL (Optional)</span></label>
            <input v-model="aiSettings.apiBaseUrl" type="text" :placeholder="aiSettings.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com'" class="input input-bordered w-full" />
          </div>
        </div>

        <div class="modal-action mt-6">
          <button class="btn" @click="showAiGenerateModal = false" :disabled="generating">Cancel</button>
          <button class="btn btn-secondary" @click="generateViaAi" :disabled="selectedMaterials.length === 0 || generating">
            <span v-if="generating" class="loading loading-spinner"></span>
            Generate
          </button>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { toast } from 'vue-sonner';
import JSZip from 'jszip';

import type { CoursePack } from "~/types";
import CoursePackCard from "~/components/courses/CoursePackCard.vue";
import { useNavigation } from "~/composables/useNavigation";
import { useCoursePackStore } from "~/store/coursePack";
import { useUserStore } from "~/store/user";
import { isAuthenticated } from "~/services/auth";
import {
  createCoursePack, updateCoursePack, deleteCoursePack,
  exportCoursePack, importCoursePack, generateCourseViaAI
} from '~/api/course-pack';
import { fetchMaterials, type Material } from '~/api/material';

const coursePackStore = useCoursePackStore();
const userStore = useUserStore();
const { gotoCourseList } = useNavigation();
const isLoading = ref(false);

const showCreateModal = ref(false);
const editingPackId = ref<string | null>(null);
const newPack = ref({ title: '', description: '' });

const importInput = ref<HTMLInputElement | null>(null);

// AI Generation state
const showAiGenerateModal = ref(false);
const availableMaterials = ref<Material[]>([]);
const selectedMaterials = ref<string[]>([]);
const aiPrompt = ref('');
const loadingMaterials = ref(false);
const generating = ref(false);
const aiSettings = ref({
  provider: 'openai',
  apiKey: '',
  apiBaseUrl: ''
});

setup();

async function setup() {
  isLoading.value = true;
  await coursePackStore.setupCoursePacks();
  isLoading.value = false;
}

function handleGoToCoursePack(coursePack: CoursePack) {
  if (coursePack.isFree) {
    gotoCourseList(coursePack.id);
  } else {
    // 看看是不是会员 不是的话 直接弹出消息告知 需要是会员
    // TODO 还没有检测是不是会员的功能函数
    console.log("需要是会员");
  }
}

watch(showAiGenerateModal, async (val) => {
  if (val) {
    loadingMaterials.value = true;
    try {
      const res = await fetchMaterials();
      availableMaterials.value = Array.isArray(res) ? res : [];
    } catch {
      toast.error('Failed to fetch materials');
    } finally {
      loadingMaterials.value = false;
    }
  } else {
    selectedMaterials.value = [];
    aiPrompt.value = '';
  }
});

const openEditModal = (pack: any) => {
  editingPackId.value = pack.id;
  newPack.value = { title: pack.title, description: pack.description };
  showCreateModal.value = true;
};

const saveNewPack = async () => {
  try {
    if (editingPackId.value) {
      await updateCoursePack(editingPackId.value, newPack.value);
      toast.success('Course pack updated');
    } else {
      await createCoursePack(newPack.value);
      toast.success('Course pack created');
    }
    showCreateModal.value = false;
    newPack.value = { title: '', description: '' };
    editingPackId.value = null;
    await setup();
  } catch {
    toast.error(editingPackId.value ? 'Failed to update course pack' : 'Failed to create course pack');
  }
};

const removeCoursePack = async (id: string) => {
  if (!confirm('Are you sure you want to delete this course pack? All its courses will be lost.')) return;
  try {
    await deleteCoursePack(id);
    toast.success('Course Pack deleted');
    await setup();
  } catch {
    toast.error('Failed to delete course pack');
  }
};

const exportPack = async (id: string, title: string) => {
  try {
    const data = await exportCoursePack(id);

    const zip = new JSZip();

    // Add meta file
    const metaData = {
      title: data.title,
      description: data.description,
      isFree: data.isFree,
      cover: data.cover
    };
    zip.file("meta.json", JSON.stringify(metaData, null, 2));

    // Add each course as a separate JSON file
    if (data.courses && data.courses.length > 0) {
      const coursesFolder = zip.folder("courses");
      data.courses.forEach((course: any, index: number) => {
        coursesFolder?.file(`${index + 1}_${course.title.replace(/\s+/g, '_')}.json`, JSON.stringify(course, null, 2));
      });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_export.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export successful');
  } catch {
    toast.error('Failed to export course pack');
  }
};

const handleImportClick = () => {
  if (importInput.value) {
    importInput.value.click();
  }
};

const onImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const toastId = toast.loading('Importing course pack...');

  try {
    let importData: any = {};

    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);

      // Try to read meta.json
      const metaFile = zip.file("meta.json");
      if (metaFile) {
        const metaContent = await metaFile.async("string");
        importData = JSON.parse(metaContent);
      } else {
        importData.title = file.name.replace('.zip', '');
        importData.description = 'Imported from ZIP';
      }

      importData.courses = [];
      const coursesFolder = zip.folder("courses");

      if (coursesFolder) {
        const files = Object.keys(coursesFolder.files)
          .filter(name => name.endsWith('.json') && !coursesFolder.files[name].dir)
          .sort(); // Sort to maintain numerical order if files are named like "1_xxx.json"

        for (const fileName of files) {
          const content = await coursesFolder.files[fileName].async("string");
          try {
            const courseData = JSON.parse(content);
            importData.courses.push(courseData);
          } catch (e) {
            console.error(`Skipping invalid course JSON: ${fileName}`);
          }
        }
      }
    } else {
      // Handle plain JSON upload
      const content = await file.text();
      importData = JSON.parse(content);
    }

    await importCoursePack(importData);
    toast.success('Course pack imported successfully', { id: toastId });
    await setup();
  } catch (err) {
    toast.error('Invalid file or failed to import', { id: toastId });
  } finally {
    input.value = '';
  }
};

onMounted(() => {
  // Load AI settings from local storage
  const savedSettings = localStorage.getItem('aiSettings');
  if (savedSettings) {
    try {
      aiSettings.value = JSON.parse(savedSettings);
    } catch {}
  }
});

const generateViaAi = async () => {
  generating.value = true;
  const toastId = toast.loading('AI is analyzing materials and generating course content... This may take a minute.');

  // Save AI settings to local storage
  localStorage.setItem('aiSettings', JSON.stringify(aiSettings.value));

  try {
    const aiResult = await generateCourseViaAI({
      materialNames: selectedMaterials.value,
      prompt: aiPrompt.value,
      provider: aiSettings.value.provider,
      apiKey: aiSettings.value.apiKey,
      apiBaseUrl: aiSettings.value.apiBaseUrl
    });

    toast.loading('Saving generated course pack...', { id: toastId });
    await importCoursePack(aiResult);

    toast.success('AI generation complete!', { id: toastId });
    showAiGenerateModal.value = false;
    await setup();
  } catch (err) {
    toast.error('AI generation failed. Please check your API keys, network connection, or try smaller files.', { id: toastId, duration: 8000 });
  } finally {
    generating.value = false;
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style></style>
