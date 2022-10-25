<template>
  <div>
    <h1>Nuxt module playground!</h1>
    <ul>
      <li v-for="message of messages">{{ message }}</li>
    </ul>
    <input v-model="message" />
    <button @click="sendMessage">Click Me To Send Message</button>
  </div>
</template>

<script setup lang="ts">
const { $io } = useNuxtApp();
const messages = ref([] as string[]);
const message = ref("")

const sendMessage = () => {
  $io.emit("message", unref(message));
  message.value = ""
};

onMounted(() => {
  $io.on("message", (text: string) => {
    messages.value.push(text)
  });
})
</script>

