<template>
  <div class="app-container">
    <div class="header">
      <h1>Stock Profit Calculator</h1>
      <div class="info-icon" @mouseenter="showInfo = true" @mouseleave="showInfo = false">
        <span>ⓘ</span>
        <div v-show="showInfo" class="info-tooltip">
          <h3>How it works:</h3>
          <p>This calculator finds the optimal buy and sell points within your selected time range to maximize profit.</p>
          <p>It accounts for transaction fees (0.1% per trade) and only allows buying before selling.</p>
          <p>The algorithm evaluates all possible buy-sell combinations and shows you the most profitable strategy.</p>
        </div>
      </div>
    </div>

    <div class="input-row">
      <div class="input-group">
        <label>Start Time</label>
        <input type="datetime-local" v-model="startTime" :min="minTime" :max="maxTime" />
      </div>
      <div class="input-group">
        <label>End Time</label>
        <input type="datetime-local" v-model="endTime" :min="minTime" :max="maxTime" />
      </div>
      <div class="input-group">
        <label>Investment Amount (USD)</label>
        <div class="currency-input">
          <span class="currency-symbol">$</span>
          <input type="number" v-model.number="funds" placeholder="0.00" step="0.01" min="0" />
        </div>
      </div>
    </div>

    <div class="timeframe-info">
      <div class="timeframe-label">Available Data Range:</div>
      <div class="timeframe-dates">
        <span class="date-item">
          <strong>From:</strong> {{ formattedMin }}
        </span>
        <span class="date-separator">→</span>
        <span class="date-item">
          <strong>To:</strong> {{ formattedMax }}
        </span>
      </div>
      <div class="timeframe-note">
        Select any time range within this period to analyze
      </div>
    </div>

    <button @click="getProfit" class="calc-button" :disabled="!canCalculate">
      Calculate Optimal Strategy
    </button>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="result" class="result-section">
      <h3>Optimal Trading Strategy</h3>
      
      <div class="result-row">
        <div class="result-item">
          <div class="result-label">Buy</div>
          <div class="result-value">{{ shortTime(result.buyTime) }} @ ${{ result.buyPrice }}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Sell</div>
          <div class="result-value">{{ shortTime(result.sellTime) }} @ ${{ result.sellPrice }}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Shares</div>
          <div class="result-value">{{ safeToFixed(result?.numShares, 4) }}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Gross Profit</div>
          <div class="result-value profit-positive">${{ safeToFixed(result?.profit, 2) }}</div>
        </div>
      </div>
    </div>

    <div v-if="result" class="result-section">

      <div class="costs-row">
        <div class="costs-item">
          <div class="costs-label">Transaction Costs</div>
          <div class="costs-value">${{ safeToFixed(result?.totalCost, 2) }}</div>
        </div>
        <div class="costs-item">
          <div class="costs-label">Net Profit</div>
          <div class="costs-value net-profit">${{ safeToFixed(result?.netProfit, 2) }}</div>
        </div>
      </div>
    </div>
 

    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
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
const showInfo = ref(false);
let chartInstance = null;

onMounted(async () => {
  const res = await api.get('/profit/minmax');
  minTime.value = res.data.min;
  maxTime.value = res.data.max;
});

onUnmounted(() => {
  // Clean up chart instance to prevent memory leaks
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});

const formattedMin = computed(() => new Date(minTime.value).toLocaleString());
const formattedMax = computed(() => new Date(maxTime.value).toLocaleString());
const shortTime    = ts => new Date(ts).toLocaleTimeString();
const canCalculate = computed(() => startTime.value && endTime.value && funds.value > 0);

watch(chartOptions, (options) => {
  if (!options || !chartContainer.value) return;
  
  // Clean up existing chart before creating new one
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  
  // Create new chart
  chartInstance = Highcharts.chart(chartContainer.value, options);
});

async function getProfit() {
  error.value = '';
  result.value = null;
  chartOptions.value = null;
  
  // Clean up existing chart
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  
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

function safeToFixed(val, digits = 2) {
  return typeof val === 'number' ? val.toFixed(digits) : 'N/A';
}
</script>

<style>
.app-container {
  max-width: 800px;
  margin: 2rem auto;
  font-family: sans-serif;
  color: #eee;
  background-color: #242424;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 body {
  background-color: #242424
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.header h1 {
  margin: 0;
  color: #eee;
}
.info-icon {
  position: relative;
  cursor: pointer;
  font-size: 1.5rem;
  color: #aaa;
}
.info-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: #eee;
  padding: 1rem;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  width: 300px;
  text-align: left;
  font-size: 0.9rem;
  line-height: 1.5;
}
.info-tooltip h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #4CAF50;
}
.info-tooltip p {
  margin-bottom: 0.5rem;
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
.currency-input {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.currency-symbol {
  font-size: 1.1rem;
  color: #aaa;
}
.timeframe-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: #aaa;
  text-align: center;
}
.timeframe-label {
  font-weight: bold;
  color: #eee;
}
.timeframe-dates {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.date-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.date-separator {
  font-size: 1rem;
  color: #aaa;
}
.timeframe-note {
  font-style: italic;
  color: #888;
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
.calc-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #555;
  border-color: #777;
}
.error-msg {
  color: #ff5555;
  font-size: 0.9rem;
}
.result-section {
  margin-top: 1rem;
  padding: 1rem;
  background: #333;
  border-radius: 4px;
  border-left: 3px solid #4CAF50;
}
.result-section h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #4CAF50;
}
.result-row {
  display: flex;
  gap: 1rem;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}
.result-item {
  flex: 1;
}
.result-label {
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 0.25rem;
}
.result-value {
  font-weight: bold;
  color: #eee;
}
.profit-positive {
  color: #4CAF50;
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
.costs-label {
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 0.25rem;
}
.costs-value {
  font-weight: bold;
  color: #eee;
}
.net-profit {
  color: #4CAF50;
}
.chart-container {
  width: 100%;
  height: 300px;
  margin-top: 1rem;
}
</style>
