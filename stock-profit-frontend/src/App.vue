<template>
  <div class="app-container">
    <div class="input-row">
      <div class="input-group">
        <label>Start</label>
        <input type="datetime-local" v-model="startTime" :min="minTime" :max="maxTime" />
      </div>
      <div class="input-group">
        <label>End</label>
        <input type="datetime-local" v-model="endTime" :min="minTime" :max="maxTime" />
      </div>
      <div class="input-group">
        <label>Funds</label>
        <input type="number" v-model.number="funds" placeholder="0.00" />
      </div>
    </div>

    <div class="timeframe">
      Available: {{ formattedMin }} → {{ formattedMax }}
    </div>

    <button @click="getProfit" class="calc-button">Calculate</button>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="result" class="result-row">
      <div class="result-item"><strong>Buy:</strong> {{ shortTime(result.buyTime) }} @ ${{ result.buyPrice }}</div>
      <div class="result-item"><strong>Sell:</strong> {{ shortTime(result.sellTime) }} @ ${{ result.sellPrice }}</div>
      <div class="result-item"><strong>Shares:</strong> {{ result.numShares.toFixed(4) }}</div>
      <div class="result-item"><strong>Gross Profit:</strong> ${{ result.profit.toFixed(2) }}</div>
    </div>

    <div v-if="result" class="costs-row">
      <div class="costs-item"><strong>Transaction Costs:</strong> ${{ result.totalCost.toFixed(2) }}</div>
      <div class="costs-item"><strong>Net Profit:</strong> ${{ result.netProfit.toFixed(2) }}</div>
    </div>

    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Highcharts from 'highcharts';
import api from './services/api.js';

// Use local time instead of UTC
Highcharts.setOptions({
  time: { useUTC: false }
});

const startTime = ref('');
const endTime   = ref('');
const funds     = ref(0);
const minTime   = ref('');
const maxTime   = ref('');
const result    = ref(null);
const chartOptions = ref(null);
const error     = ref('');
const chartContainer = ref(null);
let chartInstance = null;

onMounted(async () => {
  const res = await api.get('/profit/minmax');
  minTime.value = res.data.min;
  maxTime.value = res.data.max;
});

const formattedMin = computed(() => new Date(minTime.value).toLocaleString());
const formattedMax = computed(() => new Date(maxTime.value).toLocaleString());
const shortTime    = ts => new Date(ts).toLocaleTimeString();

watch(chartOptions, (options) => {
  if (!options || !chartContainer.value) return;
  if (chartInstance) chartInstance.destroy();
  chartInstance = Highcharts.chart(chartContainer.value, options);
});

async function getProfit() {
  error.value = '';
  result.value = null;
  chartOptions.value = null;
  try {
    const payload = {
      startTime: new Date(startTime.value).toISOString(),
      endTime:   new Date(endTime.value).toISOString(),
      funds:     funds.value,
    };
    const res = await api.post('/profit', payload);
    result.value = res.data;

    const dataSeries = res.data.chartData.map(p => [Date.parse(p.timestamp), p.price]);
    chartOptions.value = {
      chart: {
        zoomType: 'x',
        backgroundColor: '#2b2b2b'
      },
      title: { text: null },
      xAxis: {
        type: 'datetime',
        labels: { style: { color: '#eee' } },
        lineColor: '#444',
        tickColor: '#444'
      },
      yAxis: {
        title: { text: 'Price', style: { color: '#eee' } },
        labels: { style: { color: '#eee' } },
        gridLineColor: '#444'
      },
      series: [{
        type: 'line',
        data: dataSeries,
        name: 'Price',
        color: '#1B3C53',
        marker: { enabled: false }
      }, {
        type: 'scatter',
        data: [
          [Date.parse(res.data.buyTime), res.data.buyPrice],
          [Date.parse(res.data.sellTime), res.data.sellPrice]
        ],
        marker: { symbol: 'circle', name: 'Buy/Sell', radius: 6, color: '#901E3E' }
      }],
      legend: { enabled: false },
      credits: { enabled: false }
    };
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  }
}
</script>

<style>
.app-container {
  max-width: 800px;
  margin: 2rem auto;
  font-family: sans-serif;
  color: #eee;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.input-row {
  display: flex;
  gap: 1rem;
}
.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}
.input-group input {
  padding: 0.5rem;
  font-size: 1rem;
  background: #3b3b3b;
  border: 1px solid #555;
  color: #eee;
}
.timeframe {
  font-size: 0.85rem;
  color: #aaa;
}
.calc-button {
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 0.5rem;
  background: transparent;
  border: 2px solid #eee;
  color: #eee;
}
.calc-button:hover {
  background: #444;
}
.error-msg {
  color: #ff5555;
  font-size: 0.9rem;
}
.result-row {
  display: flex;
  gap: 1rem;
  font-size: 0.95rem;
  margin-top: 0.5rem;
}
.result-item {
  flex: 1;
}
.costs-row {
  display: flex;
  gap: 1rem;
  font-size: 0.95rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #333;
  border-radius: 4px;
  border-left: 3px solid #4CAF50;
}
.costs-item {
  flex: 1;
}
.costs-item:last-child {
  color: #4CAF50;
  font-weight: bold;
}
.chart-container {
  width: 100%;
  height: 300px;
  margin-top: 1rem;
}
</style>
