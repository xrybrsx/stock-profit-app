<template>
  <div class="container">
    <h1>Stock Profit Calculator</h1>

    <form @submit.prevent="getProfit">
      <div class="field">
        <label for="start">Start Time:</label>
        <input
          id="start"
          type="datetime-local"
          v-model="startTime"
          required
        />
      </div>

      <div class="field">
        <label for="end">End Time:</label>
        <input
          id="end"
          type="datetime-local"
          v-model="endTime"
          required
        />
      </div>

      <div class="field">
        <label for="funds">Available Funds:</label>
        <input
          id="funds"
          type="number"
          v-model.number="funds"
          min="0.01"
          step="0.01"
          required
        />
      </div>

      <button type="submit">Calculate Profit</button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result">
      <h2>Results</h2>
      <p><strong>Buy Time:</strong> {{ result.buyTime }}</p>
      <p><strong>Buy Price:</strong> {{ result.buyPrice }}</p>
      <p><strong>Sell Time:</strong> {{ result.sellTime }}</p>
      <p><strong>Sell Price:</strong> {{ result.sellPrice }}</p>
      <p><strong>Shares Bought:</strong> {{ result.numShares.toFixed(4) }}</p>
      <p><strong>Profit:</strong> {{ result.profit.toFixed(2) }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from './services/api.js';

const startTime = ref('');
const endTime   = ref('');
const funds     = ref(0);
const result    = ref(null);
const error     = ref('');

async function getProfit() {
  error.value = '';
  result.value = null;

  try {
    // Convert the browser's datetime-local (local) into an ISO string
    const payload = {
      startTime: new Date(startTime.value).toISOString(),
      endTime:   new Date(endTime.value).toISOString(),
      funds:     funds.value,
    };

    const res = await api.post('/profit', payload);
    result.value = res.data;
  } catch (e) {
    // Show validation or network errors
    error.value = e.response?.data?.message || e.message;
  }
}
</script>

<style>
.container {
  max-width: 400px;
  margin: 2rem auto;
  font-family: sans-serif;
}
.field {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.25rem;
}
input {
  width: 100%;
  padding: 0.5rem;
  box-sizing: border-box;
}
button {
  padding: 0.5rem 1rem;
}
.error {
  color: red;
  margin-top: 1rem;
}
.result {
  background: #f5f5f5;
  padding: 1rem;
  margin-top: 1rem;
  border-radius: 4px;
}
</style>
