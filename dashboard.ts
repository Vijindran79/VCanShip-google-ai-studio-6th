// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, shipmentHistory } from './state';
import { switchPage, showToast } from './ui';
import { mountService } from './router';
import { getDashboardInsights } from './api';

function renderDashboard() {
    const page = DOMElements.pageDashboard;
    if (!page) return;

    if (!State.isLoggedIn) {
        page.innerHTML = `<div class="form-container" style="text-align: center;"><p>Please log in to view your dashboard.</p></div>`;
        return;
    }

    // --- Data Calculations ---
    const totalSpend = shipmentHistory.reduce((sum, s) => sum + s.cost, 0);
    const totalShipments = shipmentHistory.length;
    const avgCost = totalShipments > 0 ? totalSpend / totalShipments : 0;

    const shipmentsByStatus = shipmentHistory.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const maxStatusCount = Math.max(...Object.values(shipmentsByStatus), 1); // Avoid division by zero
    
    const carrierPerformance = shipmentHistory.reduce((acc, s) => {
        if (!acc[s.carrier]) {
            acc[s.carrier] = { count: 0, totalCost: 0, onTimeCount: 0 };
        }
        acc[s.carrier].count++;
        acc[s.carrier].totalCost += s.cost;
        if (s.isOnTime) acc[s.carrier].onTimeCount++;
        return acc;
    }, {} as Record<string, { count: number; totalCost: number; onTimeCount: number }>);

    const shipmentsByService = shipmentHistory.reduce((acc, s) => {
        acc[s.service] = (acc[s.service] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);


    // --- Render Static HTML Structure ---
    page.innerHTML = `
        <div class="service-page-header">
            <h2>Analytics Dashboard</h2>
            <p class="subtitle">An overview of your shipping activity and AI-powered insights.</p>
        </div>
        <div class="dashboard-grid">
            <!-- Key Metrics -->
            <div class="dashboard-card kpi-card">
                <h4>Total Spend</h4>
                <p>${State.currentCurrency.symbol}${totalSpend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>
            <div class="dashboard-card kpi-card">
                <h4>Total Shipments</h4>
                <p>${totalShipments}</p>
            </div>
            <div class="dashboard-card kpi-card">
                <h4>Avg. Cost/Shipment</h4>
                <p>${State.currentCurrency.symbol}${avgCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            </div>

            <!-- Shipments by Service (Donut Chart) -->
            <div class="dashboard-card dashboard-card-large">
                <h3>Shipments by Service</h3>
                <div id="donut-chart-card" class="donut-chart-card">
                    <div id="service-donut-chart" class="donut-chart"></div>
                    <ul id="service-chart-legend" class="chart-legend"></ul>
                </div>
            </div>

            <!-- Shipments by Status Chart -->
            <div class="dashboard-card dashboard-card-large">
                <h3>Shipments by Status</h3>
                <div class="bar-chart-container">
                    ${Object.entries(shipmentsByStatus).map(([status, count]) => `
                        <div class="bar-chart-item">
                            <div class="bar-wrapper">
                               <div class="bar-chart-bar status-${status.toLowerCase().replace(/ /g, '-')}" style="height: ${(count / maxStatusCount) * 100}%;">
                                 <span class="bar-label-top">${count}</span>
                               </div>
                            </div>
                            <div class="bar-label-bottom">${status}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- AI Insights -->
            <div class="dashboard-card">
                <h3>AI Recommendations</h3>
                <div id="ai-recommendations-content" class="insights-list">
                    <div class="loading-spinner-small"></div>
                    <p class="helper-text">Generating cost-saving insights...</p>
                </div>
            </div>
            <div class="dashboard-card">
                <h3>Demand Forecast</h3>
                <div id="demand-forecast-content" class="insights-list">
                     <div class="loading-spinner-small"></div>
                     <p class="helper-text">Analyzing future trends...</p>
                </div>
            </div>

            <!-- Carrier Performance -->
             <div class="dashboard-card dashboard-card-large">
                <h3>Supplier Performance</h3>
                <div class="performance-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Carrier</th>
                                <th>Shipments</th>
                                <th>Avg. Cost</th>
                                <th>On-Time %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(carrierPerformance).map(([carrier, data]) => `
                                <tr>
                                    <td>${carrier}</td>
                                    <td>${data.count}</td>
                                    <td>${State.currentCurrency.symbol}${(data.totalCost / data.count).toFixed(2)}</td>
                                    <td>${((data.onTimeCount / data.count) * 100).toFixed(0)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // --- Dynamic Content & Chart Rendering ---

    // Donut Chart Logic
    const serviceColors: Record<string, string> = { fcl: '#1E40AF', parcel: '#3B82F6', baggage: '#F59E0B', lcl: '#0D9488', vehicle: '#4B5563', airfreight: '#0EA5E9', default: '#64748B' };
    const serviceEntries = Object.entries(shipmentsByService);
    let gradientString = 'conic-gradient(';
    let legendHtml = '';
    let cumulativePercent = 0;

    serviceEntries.forEach(([service, count]) => {
        const percent = (count / totalShipments) * 100;
        const color = serviceColors[service] || serviceColors.default;
        
        gradientString += `${color} ${cumulativePercent}% ${cumulativePercent + percent}%, `;
        
        legendHtml += `<li class="legend-item">
                        <span class="legend-color-dot" style="background-color: ${color};"></span>
                        <span class="legend-label">${service.toUpperCase()}</span>
                        <span class="legend-value">${count} (${percent.toFixed(0)}%)</span>
                      </li>`;
        
        cumulativePercent += percent;
    });
    gradientString = gradientString.slice(0, -2) + ')'; // Remove trailing comma and space

    const donutChartEl = document.getElementById('service-donut-chart');
    const legendEl = document.getElementById('service-chart-legend');
    if (donutChartEl) donutChartEl.style.background = gradientString;
    if (legendEl) legendEl.innerHTML = legendHtml;


    // AI Insights Logic
    getDashboardInsights(shipmentHistory).then(insights => {
        const recommendationsEl = document.getElementById('ai-recommendations-content');
        const forecastEl = document.getElementById('demand-forecast-content');

        if (recommendationsEl) {
            if (insights?.cost_recommendations) {
                recommendationsEl.innerHTML = `<ul>${insights.cost_recommendations.map(r => `<li>${r}</li>`).join('')}</ul>`;
            } else {
                recommendationsEl.innerHTML = `<p class="helper-text">Could not generate recommendations.</p>`;
            }
        }
        if (forecastEl) {
             if (insights?.demand_forecast) {
                forecastEl.innerHTML = `<p>${insights.demand_forecast}</p>`;
            } else {
                forecastEl.innerHTML = `<p class="helper-text">Could not generate forecast.</p>`;
            }
        }
    });
}


export function initializeDashboard() {
    const dashboardPageElement = DOMElements.pageDashboard;
    if (dashboardPageElement) {
        // Use a MutationObserver to re-render the dashboard whenever it becomes visible
        // This ensures data is fresh if the user navigates away and back.
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target as HTMLElement;
                    if (target.classList.contains('active')) {
                        renderDashboard();
                    }
                }
            }
        });
        observer.observe(dashboardPageElement, { attributes: true });
    }
}