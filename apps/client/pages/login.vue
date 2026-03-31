<script setup lang="ts">
import { ref } from "vue";
import { navigateTo } from "nuxt/app";
import { toast } from "vue-sonner";
import { getHttp } from "~/api/http";
import { fetchCurrentUser } from "~/api/user";
import { getSignInCallback, setToken } from "~/services/auth";
import { useUserStore } from "~/store/user";

const userStore = useUserStore();

const isLoginMode = ref(true);
const username = ref("");
const password = ref("");
const isLoading = ref(false);

const {
  isShowSettingUsernameModal,
  isLoadingFetchUserSetup,
  handleChangeUsername,
  newUsername
} = useUsername();

async function submit() {
  if (!username.value) {
    toast.error("用户名不能为空");
    return;
  }

  isLoading.value = true;
  try {
    const http = getHttp();
    const endpoint = isLoginMode.value ? "/auth/login" : "/auth/register";

    const body: any = { username: username.value };
    if (password.value) {
      body.password = password.value;
    }

    const res = await http<{ access_token: string }>(endpoint, {
      method: "post",
      body,
    });

    setToken(res.access_token);

    const userRes = await fetchCurrentUser();
    userStore.initUser(userRes);

    if (userStore.isNewUser()) {
      isShowSettingUsernameModal.value = true;
    } else {
      navigateTo(getSignInCallback());
    }

    toast.success(isLoginMode.value ? "登录成功" : "注册成功");
  } catch (error: any) {
    toast.error(isLoginMode.value ? "登录失败" : "注册失败", {
      description: error.message || "请检查您的用户名和密码",
    });
  } finally {
    isLoading.value = false;
  }
}

function useUsername() {
  const newUsername = ref("");
  const isShowSettingUsernameModal = ref(false);
  const isLoadingFetchUserSetup = ref(false);

  async function handleChangeUsername() {
    if (!checkUsername()) return;

    isLoadingFetchUserSetup.value = true;
    try {
      await userStore.setupNewUser({
        username: newUsername.value,
        avatar: userStore.user?.avatar || "",
      });
      navigateTo(getSignInCallback());
      isShowSettingUsernameModal.value = false;
    } catch (e: any) {
      toast.error("设置用户名失败", {
        description: e.message,
      });
    } finally {
      isLoadingFetchUserSetup.value = false;
    }
  }

  function checkUsername() {
    const minLength = 2;
    const errorMessage = {
      empty: "用户名不能为空",
      minLength: `用户名至少输入 ${minLength} 个字符`,
      invalid: "用户名只能包含字母、数字和下划线，且首字符必须是字母或下划线",
    };

    if (!newUsername.value) {
      toast.error(errorMessage.empty);
      return false;
    }

    if (newUsername.value.length < minLength) {
      toast.error(errorMessage.minLength);
      return false;
    }

    const regex = /^[A-Za-z_]\w*$/;
    if (!regex.test(newUsername.value)) {
      toast.error(errorMessage.invalid);
      return false;
    }

    return true;
  }

  return {
    checkUsername,
    newUsername,
    isShowSettingUsernameModal,
    isLoadingFetchUserSetup,
    handleChangeUsername,
  };
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UCard class="w-full max-w-md">
      <h2 class="mb-6 text-center text-2xl font-bold">
        {{ isLoginMode ? '登录' : '注册' }}
      </h2>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium">用户名 *</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium">密码 (可选)</label>
          <input
            v-model="password"
            type="password"
            placeholder="留空即为无密码登录/注册"
            class="input input-bordered w-full"
          />
        </div>

        <UButton
          type="submit"
          class="w-full justify-center"
          :loading="isLoading"
        >
          {{ isLoginMode ? '登录' : '注册' }}
        </UButton>
      </form>

      <div class="mt-4 text-center text-sm">
        <button
          @click="isLoginMode = !isLoginMode"
          class="text-primary hover:underline"
        >
          {{ isLoginMode ? '没有账号？点击注册' : '已有账号？点击登录' }}
        </button>
      </div>
    </UCard>

    <UModal
      v-model="isShowSettingUsernameModal"
      :ui="{ width: 'w-full sm:max-w-lg' }"
      prevent-close
    >
      <UCard>
        <h3 class="mb-4 text-lg font-bold">设置昵称</h3>
        <input
          v-model="newUsername"
          type="text"
          placeholder="请输入将在系统中展示的用户名"
          class="input input-sm input-bordered w-full"
          maxlength="20"
          @keydown.enter="handleChangeUsername"
        />
        <div class="modal-action">
          <UButton
            type="submit"
            @click="handleChangeUsername"
            :loading="isLoadingFetchUserSetup"
          >
            确定
          </UButton>
        </div>
      </UCard>
    </UModal>
  </div>
</template>
