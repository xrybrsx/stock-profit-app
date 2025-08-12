<template>
  <div class="app-container">
    <div class="header">
      <h1>Stock Profit Calculator</h1>
      <div v-if="!loadingStats" class="info-icon" @mouseenter="showInfo = true" @mouseleave="showInfo = false">
        <span>ⓘ</span>
        <div v-show="showInfo" class="info-tooltip">
          <h3>How it works:</h3>
          <p>This calculator finds the optimal buy and sell points within your selected time range to maximize profit.</p>
          <!-- <p>It accounts for transaction fees (0.1% per trade) and only allows buying before selling.</p> -->
          <p>The algorithm evaluates all possible buy-sell combinations and shows you the most profitable strategy.</p>
        </div>
      </div>
    </div>

    <div v-if="loadingStats" class="loading-message">
      <p>⏳ Preparing data… please wait a moment.</p>
    </div>

    <template v-else>
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

    <div class="input-row">
      <div class="input-group">
        <label>Start Time</label>
        <input type="datetime-local" v-model="startTime" :min="toLocalInputValue(minTime)" :max="toLocalInputValue(maxTime)" :disabled="loading" />
      </div>
      <div class="input-group">
        <label>End Time</label>
        <input type="datetime-local" v-model="endTime" :min="toLocalInputValue(minTime)" :max="toLocalInputValue(maxTime)" :disabled="loading" />
      </div>
      <div class="input-group">
        <label>Investment Amount (USD)</label>
        <div class="currency-input">
          <span class="currency-symbol">$</span>
          <input type="number" v-model.number="funds" placeholder="0.00" step="0.01" min="0" :disabled="loading" />
        </div>
      </div>
    </div>

    <button @click="getProfit" class="calc-button" :disabled="!canCalculate || !statsReady || loading">
      <template v-if="loading">
        <span class="spinner" aria-label="Loading">
          <svg xmlns="http://www.w3.org/2000/svg" width="54" height="18" viewBox="0 0 120 30" fill="currentColor" role="img" aria-hidden="true">
            <circle cx="15" cy="15" r="9">
              <animate attributeName="cy" values="15;7;15" dur="0.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="60" cy="15" r="9">
              <animate attributeName="cy" values="15;7;15" dur="0.8s" begin="0.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="105" cy="15" r="9">
              <animate attributeName="cy" values="15;7;15" dur="0.8s" begin="0.4s" repeatCount="indefinite" />
            </circle>
          </svg>
        </span>
      </template>
      <template v-else>
        Calculate Optimal Strategy
      </template>
    </button>
    <transition name="fade-slide" mode="out-in">
      <div v-if="loading" class="loading-subtext" :key="loadingMessage">{{ loadingMessage }}</div>
    </transition>

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
          <div class="result-label">Profit</div>
          <div class="result-value profit-positive">${{ safeToFixed(result?.profit, 2) }} ({{ result?.profitPercent?.toFixed(2) }}%)</div>
        </div>
        <div class="info-icon" @mouseenter="showProfitInfo = true" @mouseleave="showProfitInfo = false">
        <span>ⓘ</span>
        <div v-show="showProfitInfo" class="info-tooltip">
          <h3>How the profit was calculated</h3>
          <p>
            <ul>
          <li><strong>Formula:</strong> {{ result?.explanation?.formula }}</li>
          <li><strong>Points scanned:</strong> {{ result?.explanation?.pointsScanned }}</li>
          </ul>
          </p>
        </div>
      </div>
      </div>
    </div>

    <!-- Uncomment this section if you want to show transaction costs -->
    <!-- <div v-if="result" class="result-section">

      <div class="costs-row">
        <div class="costs-item">
          <div class="costs-label">
            Transaction Costs
            <span class="info-icon" @mouseenter="showCostInfo = true" @mouseleave="showCostInfo = false" @touchstart="showCostInfo = !showCostInfo">
              ⓘ
              <div v-show="showCostInfo" class="info-tooltip cost-tooltip">
                <strong>How transaction costs are calculated:</strong>
                <p>Each trade (buy and sell) incurs a fee of 0.1% of the transaction amount, with a minimum fee of $1 per trade.</p>
                <p>Total transaction cost = Buy fee + Sell fee.</p>
              </div>
            </span>
          </div>
          <div class="costs-value">${{ safeToFixed(result?.totalCost, 2) }}</div>
        </div>
        <div class="costs-item">
          <div class="costs-label">Net Profit</div>
          <div class="costs-value net-profit">${{ safeToFixed(result?.netProfit, 2) }}</div>
        </div>
      </div>
    </div>
  -->

    <div ref="chartContainer" class="chart-container"></div>
    </template>
  </div>
  </template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import Highcharts from 'highcharts';
import api from './services/api.js';
// import { getStatsReady } from './services/api.js';

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
const showProfitInfo = ref(false);
const showCostInfo = ref(false);
let chartInstance = null;
const statsReady = ref(false);
const loadingStats = ref(true);
const loading = ref(false)
const loadingMessage = ref('Thinking…')
const rotatingMessages = [
  'This may take a while…',
  'Thinking…',
  'Scanning prices…',
  'There are a lot of prices to scan…',
  'There are more prices than I expected...',
  'Please be patient…',
  'Crunching numbers…',
  'I promise I will get it done…',
  'Almost there…',
  'Please don\'t hate me...',
  'I am working on it...',
]
let loadingMessageTimer = null

function toLocalInputValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Pad with zeros for month, day, hour, minute
  const pad = n => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

onMounted(async () => {
  try {
    // Directly fetch min/max via fast path; no polling
    const res = await api.get('/profit/minmax');
    minTime.value = res.data.min;
    maxTime.value = res.data.max;
    startTime.value = toLocalInputValue(res.data.min);
    endTime.value = toLocalInputValue(res.data.max);
    statsReady.value = true;
  } catch (e) {
    console.error('Failed to load min/max:', e);
  } finally {
    loadingStats.value = false;
  }
});

onUnmounted(() => {
  // Clean up chart instance to prevent memory leaks
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (loadingMessageTimer) {
    clearInterval(loadingMessageTimer);
    loadingMessageTimer = null;
  }
});

const formattedMin = computed(() => new Date(minTime.value).toLocaleString());
const formattedMax = computed(() => new Date(maxTime.value).toLocaleString());
const shortTime    = ts => new Date(ts).toLocaleTimeString();
const canCalculate = computed(() => startTime.value && endTime.value && funds.value > 0);

watch(loading, (isLoading) => {
  if (isLoading) {
    let idx = 0
    loadingMessage.value = rotatingMessages[idx % rotatingMessages.length]
    loadingMessageTimer = setInterval(() => {
      idx = (idx + 1) % rotatingMessages.length
      loadingMessage.value = rotatingMessages[idx]
    }, 2400)
  } else {
    if (loadingMessageTimer) {
      clearInterval(loadingMessageTimer)
      loadingMessageTimer = null
    }
  }
})

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
  loading.value = true
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
      tooltip: {
        formatter: function() {
          // For line series (Price)
          if (this.series.type === 'line') {
            return `<b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}<br/><b>Price:</b> $${this.y.toFixed(2)}`;
          }
          // For scatter series (Buy/Sell)
          if (this.series.type === 'scatter') {
            return `<b>${this.point.index === 0 ? 'Buy' : 'Sell'}</b><br/><b>Time:</b> ${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}<br/><b>Price:</b> $${this.y.toFixed(2)}`;
          }
          return false;
        },
        backgroundColor: '#222',
        borderColor: '#444',
        style: { color: '#eee', fontSize: '0.95em' }
      },
      series: [{
        type: 'line',
        data: dataSeries,
        name: 'Price',
        color: '#1B3C53',
        marker: { enabled: false },
        pointStart: Date.parse(payload.startTime),
        pointInterval: null
      }, {
        type: 'scatter',
        name: 'Buy/Sell',
        data: [
          [Date.parse(res.data.buyTime), res.data.buyPrice],
          [Date.parse(res.data.sellTime), res.data.sellPrice]
        ],
        marker: { symbol: 'circle', name: 'Buy/Sell', radius: 6, color: '#901E3E' }
      }],
      legend: {
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        itemStyle: { color: '#eee', fontWeight: 'normal', fontSize: '0.95em' },
        symbolHeight: 8,
        symbolWidth: 24,
        symbolRadius: 0,
        backgroundColor: 'transparent',
        borderWidth: 0,
        itemMarginTop: 2,
        itemMarginBottom: 2,
        itemDistance: 20
      },
      credits: { enabled: false }
    };
  } catch (e) {
    error.value = e.response?.data?.message || e.message;
  } finally {
    loading.value = false
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
.input-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #555;
  border-color: #777;
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
  font-weight: bolder;
  font-size: large;
  color: #eee;
}
.timeframe-dates {
  display: flex;
  font-size: 1rem;
  color: #eee;
  align-items: center;
  gap: 0.5rem;
  justify-content: center; /* Add this to center horizontally */
  width: 100%;
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
.spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #eee;
}
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.loading-subtext {
  margin-top: 0.35rem;
  color: #aaa;
  font-size: 0.95rem;
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
.costs-label .info-icon {
  font-size: 1rem;
  vertical-align: middle;
  margin-left: 0.25rem;
}
.chart-container {
  width: 100%;
  height: 300px;
  margin-top: 1rem;
}
.cost-tooltip {
  left: auto;
  right: 0;
  min-width: 220px;
  font-size: 0.9rem;
  padding: 1rem;
  line-height: 1.5;
}

.loading-message {
  text-align: center;
  font-size: 1.1rem;
  color: #aaa;
  margin-top: 4rem;
}

.explain {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #2e2e2e;
  border-left: 3px solid #4CAF50;
  color: #ddd;
  font-size: 0.9rem;
}
.explain-title {
  font-weight: bold;
  margin-bottom: 0.25rem;
  color: #4CAF50;
}

</style>
