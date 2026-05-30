/**
 * 异环 · 经营助手 - 主逻辑
 * 
 * 核心功能：
 * 1. 用户配置拥有的雇员及等级
 * 2. 系统自动推荐最优10人+5菜搭配
 */

// ========== 全局状态 ==========
const state = {
    windVanes: [],           // 所有风向标数据
    employees: [],          // 所有雇员数据
    items: [],              // 所有商品数据
    selectedWindVane: null, // 当前选中的风向标
    employeeStates: {},     // 雇员状态 { id: { owned: boolean, level: number } }
};

// ========== 常量 ==========
const MAX_EMPLOYEES = 10;   // 最多上场雇员数
const MAX_DISHES = 5;       // 最多上架菜品数

// ========== 高级设置参数 ==========
const ADVANCED_SETTINGS = {
    // 装修加成（默认9%，范围0-1）
    decorationBonus: 0.09,
    // 基础人流量
    baseTraffic: 2400,
    // 自定义风向标加成列表
    customWindVaneBonuses: [],
    // 自定义雇员加成开关和值
    enableCustomEmployee: false,
    customDirectBonus: 0,
    customTrafficBonus: 0,
    // 自定义风向标开关和值
    enableCustomWindvane: false,
    customWindvaneCategory: '',
    customWindvaneBonus: 0,
};

// ========== 高级设置本地存储 ==========
const ADVANCED_SETTINGS_KEY = 'yihuan_advanced_settings';

function saveAdvancedSettings() {
    try {
        localStorage.setItem(ADVANCED_SETTINGS_KEY, JSON.stringify({
            decorationBonus: ADVANCED_SETTINGS.decorationBonus,
            baseTraffic: ADVANCED_SETTINGS.baseTraffic,
            customWindVaneBonuses: ADVANCED_SETTINGS.customWindVaneBonuses,
        }));
    } catch (error) {
        console.error('保存高级设置失败:', error);
    }
}

function loadAdvancedSettings() {
    try {
        const saved = localStorage.getItem(ADVANCED_SETTINGS_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            ADVANCED_SETTINGS.decorationBonus = data.decorationBonus ?? 0.09;
            ADVANCED_SETTINGS.baseTraffic = data.baseTraffic ?? 2400;
            ADVANCED_SETTINGS.customWindVaneBonuses = data.customWindVaneBonuses ?? [];
        }
    } catch (error) {
        console.error('加载高级设置失败:', error);
    }
}

// ========== 编辑状态 ==========
let editingBonusIndex = null;

// ========== 自定义风向标加成功能 ==========
function renderCustomWindVaneList() {
    const container = document.getElementById('custom-windvane-list');
    if (!container) return;
    
    if (ADVANCED_SETTINGS.customWindVaneBonuses.length === 0) {
        container.innerHTML = '<div class="rec-placeholder" style="padding: 20px; text-align: center; color: var(--text-muted);">暂无自定义加成</div>';
        return;
    }
    
    container.innerHTML = ADVANCED_SETTINGS.customWindVaneBonuses.map((bonus, index) => `
        <div class="custom-item">
            <div class="custom-item-info">
                <div class="custom-item-name">+${bonus} 方斯</div>
            </div>
            <div class="custom-item-actions">
                <button class="icon-btn edit-btn" onclick="editCustomWindVane(${index})">编辑</button>
                <button class="icon-btn delete-btn" onclick="deleteCustomWindVane(${index})">删除</button>
            </div>
        </div>
    `).join('');
}

function openAddWindVaneModal() {
    editingBonusIndex = null;
    document.getElementById('windvane-edit-title').textContent = '添加自定义风向标加成';
    document.getElementById('edit-windvane-bonus').value = '';
    document.getElementById('edit-windvane-modal').classList.remove('hidden');
}

function editCustomWindVane(index) {
    editingBonusIndex = index;
    document.getElementById('windvane-edit-title').textContent = '编辑自定义风向标加成';
    document.getElementById('edit-windvane-bonus').value = ADVANCED_SETTINGS.customWindVaneBonuses[index];
    document.getElementById('edit-windvane-modal').classList.remove('hidden');
}

function saveCustomWindVane() {
    const bonus = parseFloat(document.getElementById('edit-windvane-bonus').value) || 0;
    
    if (editingBonusIndex !== null) {
        ADVANCED_SETTINGS.customWindVaneBonuses[editingBonusIndex] = bonus;
    } else {
        ADVANCED_SETTINGS.customWindVaneBonuses.push(bonus);
        // 去重并排序
        ADVANCED_SETTINGS.customWindVaneBonuses = [...new Set(ADVANCED_SETTINGS.customWindVaneBonuses)].sort((a, b) => a - b);
    }
    
    saveAdvancedSettings();
    renderCustomWindVaneList();
    updateWindVaneSelectors();
    document.getElementById('edit-windvane-modal').classList.add('hidden');
}

function deleteCustomWindVane(index) {
    if (confirm('确定要删除这个自定义加成吗？')) {
        ADVANCED_SETTINGS.customWindVaneBonuses.splice(index, 1);
        saveAdvancedSettings();
        renderCustomWindVaneList();
        updateWindVaneSelectors();
    }
}

// ========== 高级设置模态框 ==========
function openAdvancedSettingsModal() {
    const modal = document.getElementById('advanced-settings-modal');
    const decorationInput = document.getElementById('decoration-bonus-input');
    const trafficInput = document.getElementById('base-traffic-input');
    
    // 填充当前值
    decorationInput.value = Math.round(ADVANCED_SETTINGS.decorationBonus * 100);
    trafficInput.value = ADVANCED_SETTINGS.baseTraffic;
    
    // 渲染自定义列表
    renderCustomWindVaneList();
    
    modal.classList.remove('hidden');
}

function closeAdvancedSettingsModal() {
    const modal = document.getElementById('advanced-settings-modal');
    modal.classList.add('hidden');
}

function clearAllLocalData() {
    if (confirm('确定要清除所有本地数据吗？这将包括雇员配置、风向标设置和高级设置。此操作不可撤销！')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(WINDVANE_STORAGE_KEY);
        localStorage.removeItem(ADVANCED_SETTINGS_KEY);
        
        // 重置状态
        ADVANCED_SETTINGS.decorationBonus = 0.09;
        ADVANCED_SETTINGS.baseTraffic = 2400;
        ADVANCED_SETTINGS.customWindVaneBonuses = [];
        
        // 重置雇员状态
        state.employees.forEach(emp => {
            state.employeeStates[emp.id] = {
                owned: false,
                level: 1,
            };
        });
        
        // 重置风向标
        state.selectedWindVane = null;
        
        // 重新渲染
        updateWindVaneSelectors();
        const categorySelect = document.getElementById('windvane-category-select');
        const bonusSelect = document.getElementById('windvane-bonus-select');
        if (categorySelect) categorySelect.value = '';
        if (bonusSelect) bonusSelect.value = '';
        
        // 清空推荐结果
        const resultContainer = document.getElementById('recommendation-result');
        const calcDetailSection = document.querySelector('.calc-detail-section');
        if (resultContainer) {
            resultContainer.innerHTML = '<div class="recommendation-placeholder"><p>请选择风向标并配置拥有的雇员后，点击下方按钮计算最优方案</p></div>';
        }
        if (calcDetailSection) {
            calcDetailSection.classList.add('hidden');
        }
        
        alert('所有本地数据已清除！');
        closeAdvancedSettingsModal();
    }
}

// ========== 更新风向标选择器 ==========
function updateWindVaneSelectors() {
    const categorySelect = document.getElementById('windvane-category-select');
    const bonusSelect = document.getElementById('windvane-bonus-select');
    
    if (!categorySelect || !bonusSelect) return;
    
    // 收集所有可能的类别和加成
    const categories = [...new Set(state.windVanes.map(w => w.category))];
    const originalBonuses = [...new Set(state.windVanes.map(w => w.bonus))];
    const allBonuses = [...new Set([...originalBonuses, ...ADVANCED_SETTINGS.customWindVaneBonuses])].sort((a, b) => a - b);
    
    // 更新类别选项
    categorySelect.innerHTML = '<option value="">-- 请选择类别 --</option>' + 
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    
    // 更新加成选项
    bonusSelect.innerHTML = '<option value="">-- 请选择加成 --</option>' + 
        allBonuses.map(b => `<option value="${b}">+${b} 方斯</option>`).join('');
    
    // 重新初始化选择器
    renderWindVaneSelector();
}

// ========== 更新雇员列表 ==========
function updateEmployeeList() {
    renderEmployeeList();
}

// ========== 数据加载 ==========
async function loadData() {
    try {
        const [windVanesRes, employeesRes, itemsRes] = await Promise.all([
            fetch('./ORIGEN/data/windVanes.json'),
            fetch('./ORIGEN/data/employees.json'),
            fetch('./ORIGEN/data/items.json'),
        ]);

        state.windVanes = await windVanesRes.json();
        state.employees = await employeesRes.json();
        state.items = await itemsRes.json();

        // 加载高级设置
        loadAdvancedSettings();

        // 初始化雇员状态
        state.employees.forEach(emp => {
            if (!state.employeeStates[emp.id]) {
                state.employeeStates[emp.id] = {
                    owned: false,
                    level: 1,
                };
            }
        });

        // 加载本地保存的状态
        const savedStates = loadEmployeeStates();
        if (savedStates) {
            Object.keys(savedStates).forEach(empId => {
                state.employeeStates[empId] = savedStates[empId];
            });
        }

        initUI();
    } catch (error) {
        console.error('数据加载失败:', error);
        document.getElementById('recommendation-result').innerHTML =
            '<div class="recommendation-placeholder"><p>⚠️ 数据加载失败，请确保 data 目录下的 JSON 文件存在</p></div>';
    }
}

// ========== UI 初始化 ==========
function initUI() {
    updateWindVaneSelectors();
    updateEmployeeList();
}

// ========== 风向标选择器 ==========
function renderWindVaneSelector() {
    const categorySelect = document.getElementById('windvane-category-select');
    const bonusSelect = document.getElementById('windvane-bonus-select');

    // 类别选择事件
    categorySelect.addEventListener('change', updateWindVaneSelection);
    
    // 加成选择事件
    bonusSelect.addEventListener('change', updateWindVaneSelection);

    // 恢复保存的风向标
    const savedWindVane = loadWindVane();
    if (savedWindVane) {
        categorySelect.value = savedWindVane.category;
        bonusSelect.value = String(savedWindVane.bonus);
        // 触发状态更新
        let foundWindVane = state.windVanes.find(wv =>
            wv.category === savedWindVane.category && wv.bonus === savedWindVane.bonus
        );
        if (!foundWindVane) {
            foundWindVane = {
                category: savedWindVane.category,
                bonus: savedWindVane.bonus,
                name: savedWindVane.category,
                description: `${savedWindVane.category} +${savedWindVane.bonus} 方斯`,
                isCustom: true
            };
        }
        state.selectedWindVane = foundWindVane;
    }
}

function updateWindVaneSelection() {
    const categorySelect = document.getElementById('windvane-category-select');
    const bonusSelect = document.getElementById('windvane-bonus-select');
    
    const category = categorySelect.value;
    const bonus = parseFloat(bonusSelect.value);
    
    if (category && !isNaN(bonus)) {
        // 先尝试从原始风向标的查找
        let foundWindVane = state.windVanes.find(wv => 
            wv.category === category && wv.bonus === bonus
        );
        
        // 如果没找到，就创建一个临时的风向标对象
        if (!foundWindVane) {
            foundWindVane = {
                category: category,
                bonus: bonus,
                name: category,
                description: `${category} +${bonus} 方斯`,
                isCustom: true
            };
        }
        
        state.selectedWindVane = foundWindVane;
        saveWindVane(); // 自动保存
    } else {
        state.selectedWindVane = null;
        saveWindVane(); // 清空保存
    }
}

// ========== 检查风向标是否适用于菜品 ==========
function isWindVaneApplicable(item, windVane) {
    if (!windVane) return false;
    
    const category = windVane.category;
    
    // 对于"面粉"、"咖啡豆"、"水果"，检查标签
    if (['面粉', '咖啡豆', '水果'].includes(category)) {
        return item.tags && item.tags.includes(category);
    }
    
    // 对于"饮料"、"主食"、"甜品"，检查菜品类别
    if (['饮料', '主食', '甜品'].includes(category)) {
        return item.category === category;
    }
    
    return false;
}

// ========== 检查自定义风向标的菜品匹配 ==========
function isItemWindvaneMatch(item, category) {
    // 对于"面粉"、"咖啡豆"、"水果"，检查标签
    if (['面粉', '咖啡豆', '水果'].includes(category)) {
        return item.tags && item.tags.includes(category);
    }
    
    // 对于"饮料"、"主食"、"甜品"，检查菜品类别
    if (['饮料', '主食', '甜品'].includes(category)) {
        return item.category === category;
    }
    
    return false;
}

// ========== 雇员列表 ==========
function renderEmployeeList() {
    const container = document.getElementById('employee-list');
    container.innerHTML = '';

    state.employees.forEach(emp => {
        const empState = state.employeeStates[emp.id];

        const card = document.createElement('div');
        card.className = `employee-card ${empState.owned ? 'active' : ''}`;
        card.id = `emp-card-${emp.id}`;

        // 生成等级按钮的title提示
        const levelTitles = [1, 2, 3, 4, 5].map(lv => {
            const bonuses = getLevelBonusDescription(emp, lv);
            return bonuses;
        });

        card.innerHTML = `
            <div class="employee-info">
                <div class="employee-name">${emp.name}</div>
            </div>
            <div class="employee-controls">
                <div class="level-selector" id="level-selector-${emp.id}">
                    <span class="level-label">Lv.</span>
                    ${[1, 2, 3, 4, 5].map((lv, idx) => `
                        <button class="level-btn ${empState.owned && empState.level === lv ? 'active' : ''}"
                                data-emp-id="${emp.id}" data-level="${lv}"
                                title="${levelTitles[idx]}">
                            ${lv}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        container.appendChild(card);

        // 绑定等级按钮事件
        card.querySelectorAll('.level-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const clickedLevel = parseInt(btn.dataset.level);
                const currentState = state.employeeStates[emp.id];
                
                if (currentState.owned && currentState.level === clickedLevel) {
                    // 已拥有且点击的是当前等级，取消拥有
                    currentState.owned = false;
                    card.classList.remove('active');
                    card.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                } else {
                    // 选择等级并设置为拥有
                    currentState.owned = true;
                    currentState.level = clickedLevel;
                    card.classList.add('active');
                    card.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
                
                updateOwnedCount();
                saveEmployeeStates(); // 自动保存
            });
        });
    });

    updateOwnedCount();
}

// ========== 获取等级加成描述（显示累计加成）==========
function getLevelBonusDescription(emp, level) {
    // 计算从Lv.1到该等级的累计加成
    let directTotal = 0;
    let trafficTotal = 0;
    let percentTotal = 0;
    const conditions = [];
    
    for (let lv = 1; lv <= level; lv++) {
        const bonuses = emp.levels[String(lv)] || [];
        bonuses.forEach(b => {
            if (b.type === 'direct') directTotal += b.value;
            if (b.type === 'traffic') trafficTotal += b.value;
            if (b.type === 'conditional') {
                if (b.effectType === 'direct' && b.isPercent) {
                    percentTotal += b.effectValue;
                }
                conditions.push(b);
            }
        });
    }
    
    const parts = [];
    if (directTotal > 0) parts.push(`售价+${directTotal.toFixed(2)}方斯`);
    if (trafficTotal > 0) parts.push(`人流量+${trafficTotal}`);
    if (percentTotal > 0) parts.push(`售价+${(percentTotal * 100).toFixed(1)}%`);
    
    // 添加本等级新增的条件加成说明
    const currentBonuses = emp.levels[String(level)] || [];
    currentBonuses.forEach(b => {
        if (b.type === 'conditional') {
            const condDesc = b.conditionType === 'sameTagCount'
                ? `任意标签×${b.condition.count}`
                : `${b.condition.tag}×${b.condition.count}`;
            const effectDesc = b.effectType === 'direct'
                ? (b.isPercent ? `售价+${(b.effectValue * 100).toFixed(1)}%` : `售价+${b.effectValue}方斯`)
                : (b.isPercent ? `人流量+${(b.effectValue * 100).toFixed(1)}%` : `人流量+${b.effectValue}`);
            parts.push(`[新]条件(${condDesc}→${effectDesc})`);
        }
    });
    
    if (parts.length === 0) {
        return `等级${level}: 无加成`;
    }
    return `等级${level}(累计): ${parts.join(', ')}`;
}

// ========== 更新拥有数量 ==========
function updateOwnedCount() {
    // 已移除UI显示，保留函数以便后续需要
}

// ========== 本地存储 ==========
const STORAGE_KEY = 'yihuan_employee_states';
const WINDVANE_STORAGE_KEY = 'yihuan_windvane';

function saveEmployeeStates() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.employeeStates));
    } catch (error) {
        console.error('保存雇员状态失败:', error);
    }
}

function loadEmployeeStates() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('读取雇员状态失败:', error);
    }
    return null;
}

// ========== 风向标本地存储 ==========
function getTodayNoon() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

function isWindVaneExpired(savedTimestamp) {
    const savedTime = new Date(savedTimestamp);
    const now = new Date();
    const todayNoon = getTodayNoon();

    if (now < todayNoon) {
        // 当前在今日12点前：保存时间需在昨日12点之后才有效
        const yesterdayNoon = new Date(todayNoon.getTime() - 24 * 60 * 60 * 1000);
        return savedTime < yesterdayNoon;
    } else {
        // 当前在今日12点后：保存时间需在今日12点之后才有效
        return savedTime < todayNoon;
    }
}

function saveWindVane() {
    if (!state.selectedWindVane) {
        localStorage.removeItem(WINDVANE_STORAGE_KEY);
        return;
    }
    try {
        const data = {
            category: state.selectedWindVane.category,
            bonus: state.selectedWindVane.bonus,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem(WINDVANE_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('保存风向标失败:', error);
    }
}

function loadWindVane() {
    try {
        const saved = localStorage.getItem(WINDVANE_STORAGE_KEY);
        if (!saved) return null;

        const data = JSON.parse(saved);

        // 检查是否过期
        if (isWindVaneExpired(data.savedAt)) {
            localStorage.removeItem(WINDVANE_STORAGE_KEY);
            return null;
        }

        return data;
    } catch (error) {
        console.error('读取风向标失败:', error);
        localStorage.removeItem(WINDVANE_STORAGE_KEY);
        return null;
    }
}

// ========== 推荐算法 ==========
function calculateOptimalPlan() {
    const resultContainer = document.getElementById('recommendation-result');

    // 检查前置条件
    if (!state.selectedWindVane) {
        resultContainer.innerHTML = '<div class="recommendation-placeholder"><p>⚠️ 请先选择今日风向标</p></div>';
        return;
    }

    // 检查是否有选择的雇员
    const ownedEmployees = state.employees.filter(emp => 
        state.employeeStates[emp.id] && state.employeeStates[emp.id].owned
    );
    
    if (ownedEmployees.length === 0) {
        resultContainer.innerHTML = '<div class="recommendation-placeholder"><p>⚠️ 请先勾选拥有的雇员</p></div>';
        return;
    }

    // 显示计算中状态
    resultContainer.innerHTML = '<div class="recommendation-placeholder"><p>🔄 正在计算最优方案...</p><p style="font-size: 0.9em; color: var(--text-muted);">这可能需要几秒钟，请稍候...</p></div>';

    // 使用 setTimeout 让UI先更新
    setTimeout(() => {
        const bestPlan = findBestPlan(ownedEmployees);
        renderRecommendation(bestPlan);
    }, 50);
}

// ========== 核心算法：寻找最优方案（优化版）==========
function findBestPlan(ownedEmployees) {
    // 获取拥有雇员的ID和等级
    const availableEmployees = ownedEmployees.map(emp => ({
        id: emp.id,
        level: state.employeeStates[emp.id].level,
        data: emp,
    }));

    let bestPlan = null;

    if (availableEmployees.length <= MAX_EMPLOYEES) {
        // 雇员数<=10，直接找最优菜品
        const bestDishes = findBestDishes(availableEmployees);
        bestPlan = {
            employees: availableEmployees,
            dishes: bestDishes.dishes,
            totalRevenue: bestDishes.totalRevenue,
            totalHourlyRevenue: bestDishes.totalHourlyRevenue,
            totalHourlyRevenueBeforeDecoration: bestDishes.totalHourlyRevenueBeforeDecoration,
            details: bestDishes.details,
        };
    } else {
        // 雇员数>10，使用组合搜索找到最优的10人组合
        // 先按贪心评分排序，取前15个进行组合搜索（减少计算量）
        const sortedEmployees = [...availableEmployees].sort((a, b) => {
            const bonusA = getEmployeeBonusScore(a);
            const bonusB = getEmployeeBonusScore(b);
            return bonusB - bonusA;
        });
        
        // 取前15个（如果有）进行组合搜索，平衡性能和效果
        const candidates = sortedEmployees.slice(0, Math.min(availableEmployees.length, 15));
        bestPlan = findBestEmployeeCombination(candidates);
    }

    return bestPlan;
}

// ========== 搜索最优的雇员组合 ==========
function findBestEmployeeCombination(candidates) {
    let bestTotalHourlyRevenue = -Infinity;
    let bestResult = null;
    
    // 生成所有 C(n, 10) 组合
    const combinations = [];
    const n = candidates.length;
    const k = MAX_EMPLOYEES;
    
    // 生成组合的索引
    const indices = [];
    for (let i = 0; i < k; i++) indices.push(i);
    
    while (true) {
        // 获取当前组合的雇员
        const employeeCombo = indices.map(i => candidates[i]);
        // 计算这个组合的收益
        const result = findBestDishes(employeeCombo);
        
        // 更新最优解
        if (result.totalHourlyRevenue > bestTotalHourlyRevenue) {
            bestTotalHourlyRevenue = result.totalHourlyRevenue;
            bestResult = {
                employees: employeeCombo,
                dishes: result.dishes,
                totalRevenue: result.totalRevenue,
                totalHourlyRevenue: result.totalHourlyRevenue,
                totalHourlyRevenueBeforeDecoration: result.totalHourlyRevenueBeforeDecoration,
                details: result.details,
            };
        }
        
        // 生成下一个组合
        let i = k - 1;
        while (i >= 0 && indices[i] === n - k + i) i--;
        
        if (i < 0) break;
        
        indices[i]++;
        for (let j = i + 1; j < k; j++) {
            indices[j] = indices[i] + j - i;
        }
    }
    
    return bestResult;
}

// ========== 获取雇员从Lv.1到当前等级的累计加成 ==========
function getEmployeeAccumulatedBonuses(emp) {
    const level = emp.level;
    let directBonusFlat = 0;
    let directBonusPercent = 0;
    let trafficBonus = 0;
    const conditionalBonuses = [];

    // 累加从Lv.1到当前等级的所有加成
    for (let lv = 1; lv <= level; lv++) {
        const bonuses = emp.data.levels[String(lv)] || [];
        bonuses.forEach(b => {
            if (b.type === 'direct') {
                directBonusFlat += b.value;
            } else if (b.type === 'traffic') {
                trafficBonus += b.value;
            } else if (b.type === 'conditional') {
                // 保存条件加成时，同时记录该加成对应的等级
                conditionalBonuses.push({ ...b, level: lv });
            }
        });
    }

    return {
        directBonusFlat,
        directBonusPercent,
        trafficBonus,
        conditionalBonuses,
    };
}

// ========== 计算雇员加成评分（用于排序）==========
function getEmployeeBonusScore(emp) {
    const bonuses = getEmployeeAccumulatedBonuses(emp);
    let score = bonuses.directBonusFlat * 100 + bonuses.trafficBonus;
    // 条件加成按预估效果计算，给予更高权重
    bonuses.conditionalBonuses.forEach(b => {
        let value = (b.effectValue || 0);
        // 百分比加成按更高权重计算
        if (b.isPercent) {
            value *= 200;
        } else if (b.effectType === 'direct') {
            value *= 100;
        } else {
            value *= 1;
        }
        score += value;
    });
    return score;
}

// ========== 寻找最优菜品组合（可靠版）==========
function findBestDishes(employeeCombo) {
    // 按原价从高到低排序，确保先穷举原价最高的组合
    const items = [...state.items].sort((a, b) => (b.price || 0) - (a.price || 0));
    let bestCombo = null;
    let bestTotalHourlyRevenue = -Infinity;
    
    // 生成所有 C(n,5) 组合的索引
    const combinations = [];
    const n = items.length;
    const k = MAX_DISHES;
    
    // 用迭代法生成组合，避免递归问题
    function generateCombinations() {
        const indices = [];
        for (let i = 0; i < k; i++) indices.push(i);
        
        while (true) {
            combinations.push([...indices]);
            
            // 找到最右边可以增加的位置
            let i = k - 1;
            while (i >= 0 && indices[i] === n - k + i) i--;
            
            if (i < 0) break;
            
            indices[i]++;
            for (let j = i + 1; j < k; j++) {
                indices[j] = indices[i] + j - i;
            }
        }
    }
    
    generateCombinations();
    
    // 遍历所有组合找到最优解
    for (const comboIndices of combinations) {
        const dishCombo = comboIndices.map(i => items[i]);
        const result = calculateComboRevenue(employeeCombo, dishCombo);
        
        // 只有当严格大于时才更新，保留第一次出现的最优解
        if (result.totalHourlyRevenue > bestTotalHourlyRevenue) {
            bestTotalHourlyRevenue = result.totalHourlyRevenue;
            bestCombo = { dishes: dishCombo, ...result };
        }
    }
    
    return {
        dishes: bestCombo.dishes,
        totalRevenue: bestCombo.totalRevenue,
        totalHourlyRevenue: bestCombo.totalHourlyRevenue,
        totalHourlyRevenueBeforeDecoration: bestCombo.totalHourlyRevenueBeforeDecoration,
        details: bestCombo.details,
    };
}

// 计算特定组合的收益
function calculateComboRevenue(employeeCombo, dishCombo) {
    // 统计标签
    const tagCounts = {};
    dishCombo.forEach(item => {
        if (item.tags) {
            item.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    // 计算雇员加成（等级技能叠加，考虑条件触发）
    let directBonusFlat = 0;
    let directBonusPercent = 0;
    let trafficBonusFlat = 0;
    let trafficBonusPercent = 0;
    const triggeredConditions = [];

    employeeCombo.forEach(emp => {
        const accBonuses = getEmployeeAccumulatedBonuses(emp);
        directBonusFlat += accBonuses.directBonusFlat;
        trafficBonusFlat += accBonuses.trafficBonus;
        
        accBonuses.conditionalBonuses.forEach(b => {
            const met = checkConditionWithTags(b, tagCounts);
            if (met) {
                if (b.effectType === 'direct') {
                    if (b.isPercent) {
                        directBonusPercent += b.effectValue;
                    } else {
                        directBonusFlat += b.effectValue;
                    }
                } else if (b.effectType === 'traffic') {
                    if (b.isPercent) {
                        trafficBonusPercent += b.effectValue;
                    } else {
                        trafficBonusFlat += b.effectValue;
                    }
                }
                triggeredConditions.push({
                    employee: emp.data.name,
                    level: b.level, // 使用该加成对应的等级，而不是雇员当前等级
                    description: getConditionDescription(b),
                });
            }
        });
    });

    // 应用自定义雇员加成
    if (ADVANCED_SETTINGS.enableCustomEmployee) {
        directBonusFlat += ADVANCED_SETTINGS.customDirectBonus;
        trafficBonusFlat += ADVANCED_SETTINGS.customTrafficBonus;
    }

    // 方案A：先加固定值，再乘百分比
    const trafficA = (ADVANCED_SETTINGS.baseTraffic + trafficBonusFlat) * (1 + trafficBonusPercent);
    const totalTraffic = trafficA;

    // 计算每道菜收益
    let totalRevenue = 0;
    const dishDetails = [];

    dishCombo.forEach(item => {
        const basePrice = item.price;
        let windVaneBonus = 0;
        let windVaneMatch = false;
        
        // 检查是否启用自定义风向标
        if (ADVANCED_SETTINGS.enableCustomWindvane) {
            // 自定义风标逻辑
            const customCategory = ADVANCED_SETTINGS.customWindvaneCategory;
            windVaneMatch = isItemWindvaneMatch(item, customCategory);
            if (windVaneMatch) {
                windVaneBonus = ADVANCED_SETTINGS.customWindvaneBonus;
            }
        } else if (state.selectedWindVane) {
            // 原始风标逻辑
            windVaneMatch = isWindVaneApplicable(item, state.selectedWindVane);
            if (windVaneMatch) {
                windVaneBonus = state.selectedWindVane.bonus;
            }
        }
        
        const directPercentMultiplier = 1 + directBonusPercent;
        const priceAfterFlat = basePrice + windVaneBonus + directBonusFlat;
        const priceAfterPercent = priceAfterFlat * directPercentMultiplier;
        const unitPrice = priceAfterPercent;
        const hourlyRevenue = unitPrice * (totalTraffic / 100);

        totalRevenue += unitPrice;
        dishDetails.push({
            item,
            revenue: unitPrice,
            hourlyRevenue,
            basePrice,
            windVaneBonus,
            windVaneMatch,
            directBonusFlat,
            directBonusPercent,
            directPercentMultiplier,
            trafficBonusFlat,
            trafficBonusPercent,
            trafficA,
            totalTraffic,
            priceAfterFlat,
            priceAfterPercent,
            unitPrice,
        });
    });

    const totalHourlyRevenueBeforeDecoration = dishDetails.reduce((sum, d) => sum + d.hourlyRevenue, 0);
    // 装修加成：使用用户设置的值
    const decorationMultiplier = 1 + ADVANCED_SETTINGS.decorationBonus;
    const totalHourlyRevenue = totalHourlyRevenueBeforeDecoration * decorationMultiplier;

    return {
        totalRevenue,
        totalHourlyRevenue,
        totalHourlyRevenueBeforeDecoration,
        details: {
            directBonusFlat,
            directBonusPercent,
            trafficBonusFlat,
            trafficBonusPercent,
            trafficA,
            totalTraffic,
            decorationMultiplier,
            triggeredConditions,
            dishDetails,
        },
    };
}

// ========== 计算单品收益（不考虑条件加成，等级技能叠加）==========
function calculateItemRevenue(employeeCombo, item) {
    let directBonusFlat = 0;
    let trafficBonus = 0;

    // 使用累计加成计算（Lv.1到当前等级）
    employeeCombo.forEach(emp => {
        const accBonuses = getEmployeeAccumulatedBonuses(emp);
        directBonusFlat += accBonuses.directBonusFlat;
        trafficBonus += accBonuses.trafficBonus;
    });

    const basePrice = item.price;
    // 风向标加成：直接加到基础价格上（纯数值，不是百分比）
    let windVaneBonus = 0;
    if (state.selectedWindVane && isWindVaneApplicable(item, state.selectedWindVane)) {
        windVaneBonus = state.selectedWindVane.bonus;
    }
    const trafficMultiplier = 1 + trafficBonus;

    // 公式：(基础价格 + 风向标加成 + 直接加成) × (1 + 人流量加成)
    const revenue = (basePrice + windVaneBonus + directBonusFlat) * trafficMultiplier;

    return { revenue, directBonusFlat, trafficBonus };
}

// ========== 条件检查（基于标签统计）==========
function checkConditionWithTags(bonus, tagCounts) {
    if (bonus.conditionType === 'tagCount') {
        const count = tagCounts[bonus.condition.tag] || 0;
        return count >= bonus.condition.count;
    } else if (bonus.conditionType === 'sameTagCount') {
        // 找出出现次数最多的标签（排除"相同"）
        let maxCount = 0;
        for (const [tag, count] of Object.entries(tagCounts)) {
            if (tag !== '相同' && count > maxCount) {
                maxCount = count;
            }
        }
        return maxCount >= bonus.condition.count;
    }
    return false;
}

// ========== 获取条件描述 ==========
function getConditionDescription(bonus) {
    let condDesc = '';
    if (bonus.conditionType === 'sameTagCount') {
        condDesc = `任意标签出现${bonus.condition.count}次`;
    } else {
        condDesc = `${bonus.condition.tag}标签×${bonus.condition.count}`;
    }
    const effectDesc = bonus.effectType === 'direct'
        ? (bonus.isPercent ? `售价+${(bonus.effectValue * 100).toFixed(1)}%` : `售价+${bonus.effectValue}方斯`)
        : (bonus.isPercent ? `人流量+${(bonus.effectValue * 100).toFixed(1)}%` : `人流量+${bonus.effectValue}`);
    return `${condDesc}→${effectDesc}`;
}

// ========== 渲染推荐结果 ==========
function renderRecommendation(plan) {
    const container = document.getElementById('recommendation-result');
    const calcDetailSection = document.querySelector('.calc-detail-section');
    const calcDetailContainer = document.getElementById('calc-detail-result');

    if (!plan) {
        container.innerHTML = '<div class="recommendation-placeholder"><p>未能计算出有效方案</p></div>';
        if (calcDetailSection) {
            calcDetailSection.classList.add('hidden');
        }
        return;
    }

    // 显示计算明细区域
    if (calcDetailSection) {
        calcDetailSection.classList.remove('hidden');
    }

    // 雇员列表
    const employeesHtml = plan.employees.map(emp => `
        <div class="rec-employee-item">
            <span class="rec-employee-name">${emp.data.name}</span>
            <span class="rec-employee-level">Lv.${emp.level}</span>
        </div>
    `).join('');

    // 菜品列表
    const dishesHtml = plan.details.dishDetails.map((d, idx) => `
        <div class="rec-dish-item">
            <span class="rec-dish-rank">${idx + 1}</span>
            <span class="rec-dish-name">${d.item.name}</span>
            <span class="rec-dish-price">${d.item.price} 方斯</span>
            <span class="rec-dish-revenue">${d.revenue.toFixed(2)} 方斯</span>
        </div>
    `).join('');

    // 雇员加成总结
    const conditionsHtml = `<div class="rec-conditions">
            <h4>🎯 雇员加成总结</h4>
            <div class="rec-bonuses">
                <span class="rec-bonus-item">售价加成: +${plan.details.directBonusFlat.toFixed(2)} +${(plan.details.directBonusPercent * 100).toFixed(0)}%</span>
                <span class="rec-bonus-item">人流量加成: +${plan.details.trafficBonusFlat.toFixed(0)} +${(plan.details.trafficBonusPercent * 100).toFixed(0)}%</span>
            </div>
            ${plan.details.triggeredConditions.length > 0 ? `
                <h5 style="margin: 12px 0 8px 0;">触发的条件加成</h5>
                ${plan.details.triggeredConditions.map(c => `
                    <div class="rec-condition-item triggered">✓ ${c.employee} (Lv.${c.level}): ${c.description}</div>
                `).join('')}
            ` : ''}
        </div>`;

    // 详细计算明细
    const detailHtml = `
        <p class="rec-calc-formula">单价 = (基础价格 + 风向标加成 + 雇员直接加成) × (1 + 百分比加成)</p>
        <p class="rec-calc-formula">显示每小时收益 = 单价 × (人流量/100)</p>
        <p class="rec-calc-formula">实际每小时收益 = 显示每小时收益 × (1 + 装修加成)</p>
        <div class="rec-calc-summary">
            <div class="rec-calc-summary-item">
                <span class="summary-label">基础人流量</span>
                <span class="summary-value">${ADVANCED_SETTINGS.baseTraffic}</span>
            </div>
            <div class="rec-calc-summary-item">
                <span class="summary-label">固定人流量加成</span>
                <span class="summary-value">+${plan.details.trafficBonusFlat.toFixed(1)}</span>
            </div>
            <div class="rec-calc-summary-item">
                <span class="summary-label">百分比人流量加成</span>
                <span class="summary-value">+${(plan.details.trafficBonusPercent * 100).toFixed(1)}%</span>
            </div>
            <div class="rec-calc-summary-item highlight">
                <span class="summary-label">总人流量</span>
                <span class="summary-value">${plan.details.totalTraffic.toFixed(1)}</span>
            </div>
            <div class="rec-calc-summary-item">
                <span class="summary-label">装修加成</span>
                <span class="summary-value">+${((plan.details.decorationMultiplier - 1) * 100).toFixed(0)}%</span>
            </div>
        </div>
        <div class="rec-calc-list">
            ${plan.details.dishDetails.map((d, idx) => `
                <div class="rec-calc-item">
                    <div class="rec-calc-item-header">
                        <span class="rec-calc-item-rank">${idx + 1}</span>
                        <span class="rec-calc-item-name">${d.item.name}</span>
                        <span class="rec-calc-item-result">${d.revenue.toFixed(2)} 方斯</span>
                    </div>
                    <div class="rec-calc-item-steps">
                        <div class="calc-step">
                            <span class="calc-step-label">基础价格</span>
                            <span class="calc-step-value">${d.basePrice.toFixed(2)}</span>
                        </div>
                        <div class="calc-step ${d.windVaneMatch ? 'active' : 'inactive'}">
                            <span class="calc-step-label">风向标加成</span>
                            <span class="calc-step-value">${d.windVaneMatch ? '+' + d.windVaneBonus.toFixed(2) : '+0'}</span>
                        </div>
                        <div class="calc-step">
                            <span class="calc-step-label">雇员直接加成</span>
                            <span class="calc-step-value">+${d.directBonusFlat.toFixed(2)}</span>
                        </div>
                        <div class="calc-step-divider">
                            <span class="calc-step-label">小计</span>
                            <span class="calc-step-value">${d.priceAfterFlat.toFixed(2)}</span>
                        </div>
                        ${d.directBonusPercent > 0 ? `
                        <div class="calc-step">
                            <span class="calc-step-label">百分比加成</span>
                            <span class="calc-step-value">×${d.directPercentMultiplier.toFixed(4)}</span>
                        </div>
                        <div class="calc-step-divider">
                            <span class="calc-step-label">小计</span>
                            <span class="calc-step-value">${d.priceAfterPercent.toFixed(2)}</span>
                        </div>
                        ` : ''}
                        <div class="calc-step-final">
                            <span class="calc-step-label">单价</span>
                            <span class="calc-step-value">${d.revenue.toFixed(2)} 方斯</span>
                        </div>
                        <div class="calc-step calc-step-hourly">
                            <span class="calc-step-label">每小时收益</span>
                            <span class="calc-step-value">${d.hourlyRevenue.toFixed(2)} 方斯/小时</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="rec-calc-total">
            <div class="rec-calc-total-item">
                <span class="total-label">总单价</span>
                <span class="total-value">${plan.totalRevenue.toFixed(2)} 方斯</span>
            </div>
            <div class="rec-calc-total-item">
                <span class="total-label">显示每小时收益</span>
                <span class="total-value">${plan.totalHourlyRevenueBeforeDecoration.toFixed(2)} 方斯/小时</span>
            </div>
            <div class="rec-calc-total-item highlight">
                <span class="total-label">实际每小时收益</span>
                <span class="total-value">${plan.totalHourlyRevenue.toFixed(2)} 方斯/小时</span>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="recommendation-content">
            <div class="rec-summary">
                <div class="rec-total-wrapper">
                    <div class="rec-total rec-total-no-bonus">
                        <span class="rec-total-label">显示总收益</span>
                        <span class="rec-total-value">${plan.totalHourlyRevenueBeforeDecoration.toFixed(2)} 方斯/小时</span>
                    </div>
                    <div class="rec-total rec-total-with-bonus">
                        <span class="rec-total-label">实际总收益</span>
                        <span class="rec-total-value">${plan.totalHourlyRevenue.toFixed(2)} 方斯/小时</span>
                    </div>
                </div>
            </div>

            <div class="rec-sections">
                <div class="rec-section">
                    <h4>👥 推荐雇员 (${plan.employees.length}人)</h4>
                    <div class="rec-employee-list">${employeesHtml}</div>
                </div>

                <div class="rec-section">
                    <h4>🍽️ 推荐菜品 (${plan.dishes.length}道)</h4>
                    <div class="rec-dish-list">${dishesHtml}</div>
                </div>
            </div>

            ${conditionsHtml}
        </div>
    `;

    // 将计算明细渲染到独立的card中
    const detailContainer = document.getElementById('calc-detail-result');
    detailContainer.innerHTML = detailHtml;
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // 计算按钮
    document.getElementById('calculate-btn').addEventListener('click', calculateOptimalPlan);

    // 高级设置按钮
    document.getElementById('advanced-settings-btn').addEventListener('click', openAdvancedSettingsModal);

    // 关闭高级设置模态框按钮
    document.getElementById('close-modal-btn').addEventListener('click', closeAdvancedSettingsModal);

    // 点击高级设置模态框背景关闭
    document.getElementById('advanced-settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'advanced-settings-modal') {
            closeAdvancedSettingsModal();
        }
    });

    // 装修加成输入变化
    document.getElementById('decoration-bonus-input').addEventListener('change', (e) => {
        const value = parseFloat(e.target.value) || 0;
        ADVANCED_SETTINGS.decorationBonus = Math.max(0, Math.min(100, value)) / 100;
        saveAdvancedSettings();
    });

    // 基础人流量输入变化
    document.getElementById('base-traffic-input').addEventListener('change', (e) => {
        const value = parseInt(e.target.value) || 0;
        ADVANCED_SETTINGS.baseTraffic = Math.max(0, value);
        saveAdvancedSettings();
    });

    // 添加自定义风向标按钮
    document.getElementById('add-windvane-btn').addEventListener('click', openAddWindVaneModal);

    // 保存自定义风向标按钮
    document.getElementById('save-windvane-btn').addEventListener('click', saveCustomWindVane);

    // 取消自定义风向标按钮
    document.getElementById('cancel-windvane-btn').addEventListener('click', () => {
        document.getElementById('edit-windvane-modal').classList.add('hidden');
    });

    // 关闭编辑风向标模态框
    document.getElementById('close-windvane-modal-btn').addEventListener('click', () => {
        document.getElementById('edit-windvane-modal').classList.add('hidden');
    });

    // 点击编辑风向标模态框背景关闭
    document.getElementById('edit-windvane-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-windvane-modal') {
            document.getElementById('edit-windvane-modal').classList.add('hidden');
        }
    });

    // 清除数据按钮
    document.getElementById('clear-data-btn').addEventListener('click', clearAllLocalData);

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAdvancedSettingsModal();
        }
    });
});
