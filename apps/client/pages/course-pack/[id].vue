<template>
  <div class="flex w-full flex-col p-4 relative">
      <!-- Create/Edit Course Modal -->
      <UModal v-model="showCreateModal" :ui="{ width: 'w-full sm:max-w-2xl' }">
        <UCard>
          <h3 class="font-bold text-lg mb-4">{{ isEditing ? 'Edit Course' : 'Add New Course' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="label"><span class="label-text">Title</span></label>
              <input v-model="newCourse.title" type="text" placeholder="Lesson 1" class="input input-bordered w-full" />
            </div>

            <div class="divider">AI Assistant (Optional)</div>
            <div class="form-control">
              <label class="label"><span class="label-text">Prompt for this specific course</span></label>
              <div class="flex space-x-2">
                <textarea v-model="singleCourseAiPrompt" placeholder="E.g. Generate 10 vocabulary words about traveling..." class="textarea textarea-bordered flex-grow h-20"></textarea>
                <button class="btn btn-secondary h-auto" @click="generateSingleCourseViaAi" :disabled="generatingSingle || !singleCourseAiPrompt.trim()">
                  <span v-if="generatingSingle" class="loading loading-spinner"></span>
                  Generate Content
                </button>
              </div>
            </div>
            <div class="divider">Manual Content</div>

            <div>
              <label class="label"><span class="label-text">Content / Words (JSON Array)</span></label>
              <textarea v-model="newCourse.description" placeholder="[{ &quot;chinese&quot;: &quot;我&quot;, &quot;english&quot;: &quot;I&quot;, &quot;soundmark&quot;: &quot;/aɪ/&quot; }]" class="textarea textarea-bordered w-full h-48"></textarea>
            </div>
          </div>
          <div class="modal-action mt-4 flex justify-end space-x-2">
            <button class="btn" @click="showCreateModal = false">Cancel</button>
            <button class="btn btn-primary" @click="saveNewCourse" :disabled="!newCourse.title || generatingSingle">Save</button>
          </div>
        </UCard>
      </UModal>

    <template v-if="isLoading">
      <Loading></Loading>
    </template>

    <template v-else>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-3xl dark:border-gray-600 font-bold">
          {{ coursePackStore.currentCoursePack?.title }}
        </h2>
        <div class="flex space-x-2" v-if="isCreator">
          <button class="btn btn-primary btn-sm" @click="openAddModal">Add Course</button>
          <button class="btn btn-secondary btn-sm" @click="showAiGenerateModal = true">AI Add Course</button>
        </div>
      </div>

      <div class="h-full scrollbar-hide">
        <div
          class="grid h-[79vh] grid-cols-1 justify-start gap-8 overflow-y-auto overflow-x-hidden pb-96 pl-0 pr-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <template
            v-for="course in coursePackStore.currentCoursePack?.courses"
            :key="course.id"
          >
            <div class="relative group">
              <CoursesCourseCard
                :title="course.title"
                :description="course.description"
                :id="course.id"
                :count="course.completionCount"
                :coursePackId="course.coursePackId"
                @click="handleChangeCourse(course.id)"
              />
              <div v-if="isCreator" class="absolute bottom-2 right-2 flex space-x-2 z-10">
                <button
                  class="btn btn-xs btn-primary shadow-md"
                  @click.stop="openEditModal(course)"
                >
                  Edit
                </button>
                <button
                  class="btn btn-xs btn-error shadow-md"
                  @click.stop="removeCourse(course.id)"
                >
                  Delete
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- AI Generate Modal -->
      <UModal v-model="showAiGenerateModal" :ui="{ width: 'w-full sm:max-w-2xl' }" prevent-close>
        <UCard>
          <h3 class="font-bold text-lg mb-4 text-gray-800 dark:text-white">Generate Courses via AI</h3>

          <div v-if="loadingMaterials" class="flex justify-center p-4">
            <span class="loading loading-spinner"></span>
          </div>


          <div class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Select Materials</span></label>
              <select v-model="selectedMaterials" multiple class="select select-bordered w-full h-32">
                <option v-for="mat in availableMaterials" :key="mat.name" :value="mat.name">
                  {{ mat.name }}
                </option>
              </select>
              <label class="label"><span class="label-text-alt">Hold Ctrl/Cmd to select multiple</span></label>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text">Prompt / Instructions (Optional)</span></label>
              <textarea v-model="aiPrompt" placeholder="e.g. Generate 3 short reading comprehension lessons about history." class="textarea textarea-bordered w-full h-24"></textarea>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from "#app";
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { toast } from 'vue-sonner';

import { useActiveCourseMap } from "~/composables/courses/activeCourse";
import { useCoursePackStore } from "~/store/coursePack";
import { useUserStore } from "~/store/user";
import { createCourse, deleteCourse, updateCourse, generateCourseViaAI } from '~/api/course-pack';
import { fetchMaterials, type Material } from '~/api/material';
import { getHttp } from '~/api/http';

const isLoading = ref(false);
const route = useRoute();
const coursePackStore = useCoursePackStore();
const userStore = useUserStore();
const coursePackId = route.params.id as string;
const { updateActiveCourseMap } = useActiveCourseMap();

const showCreateModal = ref(false);
const isEditing = ref(false);
const editingCourseId = ref('');
const newCourse = ref({ title: '', description: '' });

// AI Generation state
const showAiGenerateModal = ref(false);
const availableMaterials = ref<Material[]>([]);
const selectedMaterials = ref<string[]>([]);
const aiPrompt = ref('');
const loadingMaterials = ref(false);
const generating = ref(false);

const isCreator = computed(() => {
  return coursePackStore.currentCoursePack?.creatorId === userStore.user?.id;
});

setup();

async function setup() {
  isLoading.value = true;
  await coursePackStore.setupCoursePack(coursePackId);
  isLoading.value = false;
}

onMounted(async () => {
  if (isCreator.value) {
    loadingMaterials.value = true;
    try {
      availableMaterials.value = await fetchMaterials();
    } catch (e) {
      console.error('Failed to fetch materials', e);
    } finally {
      loadingMaterials.value = false;
    }
  }
});

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

    toast.loading('Saving generated courses...', { id: toastId });

    // Create new courses in this pack
    if (aiResult.courses && Array.isArray(aiResult.courses)) {
      for (const c of aiResult.courses) {
        await createCourse(coursePackId, {
          title: c.title,
          description: typeof c.content === 'string' ? c.content : JSON.stringify(c.content)
        });
      }
    }

    toast.success('AI generation complete!', { id: toastId });
    showAiGenerateModal.value = false;
    coursePackStore.currentCoursePack = undefined; // Force reload
    await setup();
  } catch (err) {
    toast.error('AI generation failed. Please check your API keys, network connection, or try smaller files.', { id: toastId, duration: 8000 });
  } finally {
    generating.value = false;
  }
};

function handleChangeCourse(courseId: string) {
  updateActiveCourseMap(coursePackId, courseId);
  navigateTo(`/game/${coursePackId}/${courseId}`);
}

const openEditModal = (course: any) => {
  isEditing.value = true;
  singleCourseAiPrompt.value = '';
  editingCourseId.value = course.id;
  newCourse.value = { title: course.title, description: course.description };
  showCreateModal.value = true;
};

// Override the Add Course button to reset state
const openAddModal = () => {
  isEditing.value = false;
  singleCourseAiPrompt.value = '';
  editingCourseId.value = '';
  newCourse.value = { title: '', description: '' };
  showCreateModal.value = true;
};

const singleCourseAiPrompt = ref('');
const generatingSingle = ref(false);

const generateSingleCourseViaAi = async () => {
  generatingSingle.value = true;
  const toastId = toast.loading('AI is generating course content...');
  try {
    const aiSettingsData = JSON.parse(localStorage.getItem('aiSettings') || '{}');
    const http = getHttp();
    const result = await http<any>('/ai/generate-single-course', {
      method: 'post',
      body: {
        prompt: singleCourseAiPrompt.value,
        provider: aiSettingsData.provider,
        apiKey: aiSettingsData.apiKey,
        apiBaseUrl: aiSettingsData.apiBaseUrl,
        model: aiSettingsData.model
      }
    });

    if (result && result.title && result.content) {
      newCourse.value.title = newCourse.value.title || result.title;
      newCourse.value.description = JSON.stringify(result.content, null, 2);
      toast.success('Generated successfully!', { id: toastId });
    } else {
      toast.error('AI did not return the expected format.', { id: toastId });
    }
  } catch (err) {
    toast.error('AI generation failed.', { id: toastId });
  } finally {
    generatingSingle.value = false;
  }
};

const saveNewCourse = async () => {
  try {
    if (isEditing.value && editingCourseId.value) {
      await updateCourse(coursePackId, editingCourseId.value, newCourse.value);
      toast.success('Course updated successfully');
    } else {
      await createCourse(coursePackId, newCourse.value);
      toast.success('Course created successfully');
    }
    showCreateModal.value = false;
    newCourse.value = { title: '', description: '' };
    // Reload course pack
    coursePackStore.currentCoursePack = undefined; // Force reload
    await setup();
  } catch {
    toast.error(`Failed to ${isEditing.value ? 'update' : 'create'} course`);
  }
};

const removeCourse = async (courseId: string) => {
  if (!confirm('Are you sure you want to delete this course?')) return;
  try {
    await deleteCourse(coursePackId, courseId);
    toast.success('Course deleted');
    coursePackStore.currentCoursePack = undefined; // Force reload
    await setup();
  } catch {
    toast.error('Failed to delete course');
  }
};
</script>
