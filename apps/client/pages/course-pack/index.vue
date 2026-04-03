<template>
  <div class="flex w-full flex-col">

    <div class="flex items-center justify-between mb-4 px-4 sm:px-0">
      <h2 class="text-3xl dark:border-gray-600 font-bold">课程包列表</h2>
      <div class="flex space-x-2">
        <button class="btn btn-secondary btn-sm" @click="showAiGenerateModal = true">AI Generate</button>
        <button class="btn btn-primary btn-sm" @click="showCreateModal = true">Create Pack</button>
        <button class="btn btn-accent btn-sm" @click="handleImportClick">Import</button>
        <input type="file" ref="importInput" class="hidden" accept=".json,.zip" @change="onImportFile" />
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
          <template v-for="coursePack in coursePackStore.coursePacks">

            <div class="relative group h-full">
              <CoursePackCard
                :coursePack="{
                  id: coursePack.id,
                  title: coursePack.title,
                  description: coursePack.description,
                  cover: coursePack.cover,
                  isFree: coursePack.isFree,
                }"
                @cardClick="handleGoToCoursePack"
              ></CoursePackCard>
              <div v-if="isAuthenticated() && (coursePack.creatorId === userStore.user?.id || coursePack.uId === userStore.user?.id)" class="absolute bottom-2 right-2 flex space-x-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="btn btn-xs btn-outline bg-base-100 shadow-md" @click.stop="openEditModal(coursePack)">Edit</button>
                <button class="btn btn-xs btn-outline bg-base-100 shadow-md" @click.stop="exportPack(coursePack.id, coursePack.title)">Export</button>
                <button class="btn btn-xs btn-error btn-outline bg-base-100 shadow-md" @click.stop="removeCoursePack(coursePack.id)">Delete</button>
              </div>
            </div>

          </template>
        </div>
      </div>
    </template>

    <!-- AI Generate Modal -->
    <UModal v-model="showAiGenerateModal" :ui="{ width: 'w-full sm:max-w-2xl' }" prevent-close>
      <UCard>
        <h3 class="font-bold text-lg mb-4 text-gray-800 dark:text-white">Generate Course Pack via AI</h3>

        <div v-if="loadingMaterials" class="flex justify-center p-4">
          <span class="loading loading-spinner"></span>
        </div>

        <div class="space-y-4">
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
        </div>

        <div class="modal-action mt-6">
          <button class="btn" @click="showAiGenerateModal = false" :disabled="generating">Cancel</button>
          <button class="btn btn-secondary" @click="generateViaAi" :disabled="generating">
            <span v-if="generating" class="loading loading-spinner"></span>
            Generate
          </button>
        </div>
      </UCard>
    </UModal>

    <!-- Create/Edit Course Pack Modal -->
    <UModal v-model="showCreateModal" :ui="{ width: 'w-full sm:max-w-lg' }">
      <UCard>
        <h3 class="font-bold text-lg mb-4">{{ editingPackId ? 'Edit Course Pack' : 'Create Course Pack' }}</h3>
        <div class="space-y-4">
          <div>
            <label class="label"><span class="label-text">Title</span></label>
            <input v-model="newPack.title" type="text" placeholder="My English Course" class="input input-bordered w-full" />
          </div>
          <div>
            <label class="label"><span class="label-text">Description</span></label>
            <textarea v-model="newPack.description" placeholder="A course for beginners..." class="textarea textarea-bordered w-full"></textarea>
          </div>
        </div>
        <div class="modal-action mt-4 flex justify-end space-x-2">
          <button class="btn" @click="showCreateModal = false">Cancel</button>
          <button class="btn btn-primary" @click="saveNewPack" :disabled="!newPack.title">Save</button>
        </div>
      </UCard>
    </UModal>


  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { toast } from 'vue-sonner';
import JSZip from 'jszip';
import {
  createCoursePack, updateCoursePack, deleteCoursePack,
  exportCoursePack, importCoursePack, generateCourseViaAI
} from '~/api/course-pack';
import { fetchMaterials, type Material } from '~/api/material';


import type { CoursePack } from "~/types";
import CoursePackCard from "~/components/courses/CoursePackCard.vue";
import { useNavigation } from "~/composables/useNavigation";
import { useCoursePackStore } from "~/store/coursePack";
import { useUserStore } from "~/store/user";
import { isAuthenticated } from "~/services/auth";


const coursePackStore = useCoursePackStore();
const { gotoCourseList } = useNavigation();
const userStore = useUserStore();

const isLoading = ref(false);

setup();

async function setup() {
  // 课程包不会更新 所以初始化的时候只拉取一次数据就好了
  if (true) {
    isLoading.value = true;
    await coursePackStore.setupCoursePacks();
    isLoading.value = false;
  }
}


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
    await coursePackStore.setupCoursePacks();
  } catch {
    toast.error(editingPackId.value ? 'Failed to update course pack' : 'Failed to create course pack');
  }
};

const removeCoursePack = async (id: string) => {
  if (!confirm('Are you sure you want to delete this course pack? All its courses will be lost.')) return;
  try {
    await deleteCoursePack(id);
    toast.success('Course Pack deleted');
    await coursePackStore.setupCoursePacks();
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
          .sort();

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
    await coursePackStore.setupCoursePacks();
  } catch (err) {
    toast.error('Invalid file or failed to import', { id: toastId });
  } finally {
    input.value = '';
  }
};

const generateViaAi = async () => {
  generating.value = true;
  const toastId = toast.loading('AI is analyzing materials and generating course content... This may take a minute.');

  try {
    const aiSettingsData = JSON.parse(localStorage.getItem('aiSettings') || '{}');
    const aiResult = await generateCourseViaAI({
      materialNames: selectedMaterials.value,
      prompt: aiPrompt.value,
      provider: aiSettingsData.provider,
      apiKey: aiSettingsData.apiKey,
      apiBaseUrl: aiSettingsData.apiBaseUrl,
      model: aiSettingsData.model
    });

    toast.loading('Saving generated course pack...', { id: toastId });
    await importCoursePack(aiResult);

    toast.success('AI generation complete!', { id: toastId });
    showAiGenerateModal.value = false;
    await coursePackStore.setupCoursePacks();
  } catch (err) {
    toast.error('AI generation failed.', { id: toastId, duration: 8000 });
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

function handleGoToCoursePack(coursePack: CoursePack) {
  if (true) {
    gotoCourseList(coursePack.id);
  } else {
    // 看看是不是会员 不是的话 直接弹出消息告知 需要是会员
    // TODO 还没有检测是不是会员的功能函数
    console.log("需要是会员");
  }
}
</script>

<style></style>
