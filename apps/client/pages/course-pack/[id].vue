<template>
  <div class="flex w-full flex-col p-4 relative">
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
              <div v-if="isCreator" class="absolute top-2 right-2 flex flex-col space-y-2 opacity-100 transition-opacity">
                <button
                  class="btn btn-sm btn-primary btn-circle shadow-lg"
                  @click.stop="openEditModal(course)"
                >
                  ✎
                </button>
                <button
                  class="btn btn-sm btn-error btn-circle shadow-lg"
                  @click.stop="removeCourse(course.id)"
                >
                  ✕
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Create/Edit Course Modal -->
      <UModal v-model="showCreateModal" :ui="{ width: 'w-full sm:max-w-lg' }">
        <UCard>
          <h3 class="font-bold text-lg mb-4">{{ isEditing ? 'Edit Course' : 'Add New Course' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="label"><span class="label-text">Title</span></label>
              <input v-model="newCourse.title" type="text" placeholder="Lesson 1" class="input input-bordered w-full" />
            </div>
            <div>
              <label class="label"><span class="label-text">Content / Words (JSON/Text)</span></label>
              <textarea v-model="newCourse.description" placeholder="Content data..." class="textarea textarea-bordered w-full h-32"></textarea>
            </div>
          </div>
          <div class="modal-action mt-4 flex justify-end space-x-2">
            <button class="btn" @click="showCreateModal = false">Cancel</button>
            <button class="btn btn-primary" @click="saveNewCourse" :disabled="!newCourse.title">Save</button>
          </div>
        </UCard>
      </UModal>

    </template>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from "#app";
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { toast } from 'vue-sonner';

import { useActiveCourseMap } from "~/composables/courses/activeCourse";
import { useCoursePackStore } from "~/store/coursePack";
import { useUserStore } from "~/store/user";
import { createCourse, deleteCourse, updateCourse } from '~/api/course-pack';

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

const isCreator = computed(() => {
  return coursePackStore.currentCoursePack?.creatorId === userStore.user?.userId;
});

setup();

async function setup() {
  isLoading.value = true;
  await coursePackStore.setupCoursePack(coursePackId);
  isLoading.value = false;
}

function handleChangeCourse(courseId: string) {
  updateActiveCourseMap(coursePackId, courseId);
  navigateTo(`/game/${coursePackId}/${courseId}`);
}

const openEditModal = (course: any) => {
  isEditing.value = true;
  editingCourseId.value = course.id;
  newCourse.value = { title: course.title, description: course.description };
  showCreateModal.value = true;
};

// Override the Add Course button to reset state
const openAddModal = () => {
  isEditing.value = false;
  editingCourseId.value = '';
  newCourse.value = { title: '', description: '' };
  showCreateModal.value = true;
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

<style></style>
