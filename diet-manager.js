// 饮食管理模块 - 食物营养成分数据库和计算函数

// 食物营养成分数据库（常见食物，每100克含量）
const FOOD_DATABASE = {
    // 主食类
    '米饭': { carbs: 28, protein: 2.6, fat: 0.3, fiber: 0.4, calories: 130 },
    '面条': { carbs: 25, protein: 4, fat: 1, fiber: 1, calories: 130 },
    '馒头': { carbs: 47, protein: 7, fat: 1, fiber: 2, calories: 220 },
    '面包': { carbs: 50, protein: 8, fat: 4, fiber: 2, calories: 265 },
    '粥': { carbs: 10, protein: 1, fat: 0.2, fiber: 0.3, calories: 45 },
    '饺子': { carbs: 30, protein: 8, fat: 5, fiber: 2, calories: 185 },
    '包子': { carbs: 35, protein: 6, fat: 3, fiber: 2, calories: 180 },
    '油条': { carbs: 51, protein: 7, fat: 18, fiber: 2, calories: 386 },
    
    // 蛋白质类
    '鸡蛋': { carbs: 1.1, protein: 13, fat: 11, fiber: 0, calories: 155 },
    '鸡胸肉': { carbs: 0, protein: 31, fat: 3.6, fiber: 0, calories: 165 },
    '猪肉': { carbs: 0, protein: 27, fat: 17, fiber: 0, calories: 242 },
    '牛肉': { carbs: 0, protein: 26, fat: 15, fiber: 0, calories: 250 },
    '鱼肉': { carbs: 0, protein: 20, fat: 5, fiber: 0, calories: 125 },
    '虾': { carbs: 0, protein: 18, fat: 0.8, fiber: 0, calories: 85 },
    '豆腐': { carbs: 3, protein: 8, fat: 4, fiber: 1, calories: 80 },
    '豆浆': { carbs: 1.8, protein: 3, fat: 1.6, fiber: 0.4, calories: 33 },
    '牛奶': { carbs: 5, protein: 3.5, fat: 3.5, fiber: 0, calories: 65 },
    '酸奶': { carbs: 9, protein: 3.5, fat: 3, fiber: 0, calories: 72 },
    
    // 蔬菜类
    '青菜': { carbs: 4, protein: 1.5, fat: 0.2, fiber: 2, calories: 25 },
    '西兰花': { carbs: 7, protein: 2.8, fat: 0.4, fiber: 2.6, calories: 34 },
    '胡萝卜': { carbs: 10, protein: 1, fat: 0.2, fiber: 2.8, calories: 41 },
    '番茄': { carbs: 4, protein: 0.9, fat: 0.2, fiber: 1.2, calories: 18 },
    '黄瓜': { carbs: 3.6, protein: 0.8, fat: 0.2, fiber: 0.5, calories: 15 },
    '土豆': { carbs: 17, protein: 2, fat: 0.1, fiber: 2.2, calories: 77 },
    '茄子': { carbs: 6, protein: 1, fat: 0.2, fiber: 2.5, calories: 25 },
    '白菜': { carbs: 3, protein: 1.5, fat: 0.1, fiber: 1, calories: 17 },
    '菠菜': { carbs: 4, protein: 2.9, fat: 0.4, fiber: 2.2, calories: 23 },
    
    // 水果类
    '苹果': { carbs: 14, protein: 0.3, fat: 0.2, fiber: 2.4, calories: 52 },
    '香蕉': { carbs: 23, protein: 1.1, fat: 0.3, fiber: 2.6, calories: 89 },
    '橙子': { carbs: 12, protein: 0.9, fat: 0.1, fiber: 2.4, calories: 47 },
    '西瓜': { carbs: 8, protein: 0.6, fat: 0.2, fiber: 0.4, calories: 30 },
    '葡萄': { carbs: 18, protein: 0.7, fat: 0.2, fiber: 0.9, calories: 69 },
    '草莓': { carbs: 8, protein: 0.8, fat: 0.4, fiber: 2, calories: 32 },
    '桃子': { carbs: 10, protein: 0.9, fat: 0.1, fiber: 1.5, calories: 39 },
    
    // 油脂类
    '食用油': { carbs: 0, protein: 0, fat: 100, fiber: 0, calories: 900 },
    '坚果': { carbs: 20, protein: 15, fat: 50, fiber: 10, calories: 600 },
    '花生': { carbs: 16, protein: 25, fat: 44, fiber: 8, calories: 567 },
    '核桃': { carbs: 14, protein: 15, fat: 65, fiber: 7, calories: 654 },
    
    // 饮料类
    '水': { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 },
    '茶': { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0 },
    '咖啡': { carbs: 0, protein: 0.1, fat: 0, fiber: 0, calories: 1 },
    '果汁': { carbs: 10, protein: 0.5, fat: 0.1, fiber: 0.2, calories: 45 },
    '可乐': { carbs: 11, protein: 0, fat: 0, fiber: 0, calories: 44 },
    
    // 默认值（当食物不在数据库中时）
    '其他': { carbs: 15, protein: 5, fat: 5, fiber: 2, calories: 125 }
};

// 计算食物营养成分
function calculateNutrition(foodName, quantity = 100, unit = 'g') {
    // 查找食物数据
    const foodData = FOOD_DATABASE[foodName] || FOOD_DATABASE['其他'];
    
    // 根据单位调整数量
    let adjustedQuantity = quantity;
    
    if (unit === 'ml') {
        // 液体食物，1ml ≈ 1g（近似值）
        adjustedQuantity = quantity;
    } else if (unit === '个' || unit === '只' || unit === '颗') {
        // 按个计算，需要根据食物类型估算重量
        const estimatedWeight = {
            '鸡蛋': 50,      // 一个鸡蛋约50g
            '苹果': 150,     // 一个苹果约150g
            '香蕉': 120,     // 一根香蕉约120g
            '橙子': 130,     // 一个橙子约130g
            '馒头': 100,     // 一个馒头约100g
            '包子': 120,     // 一个包子约120g
            '饺子': 20       // 一个饺子约20g
        }[foodName] || 100; // 默认100g
        
        adjustedQuantity = quantity * estimatedWeight;
    } else if (unit === '碗') {
        // 一碗约200g
        adjustedQuantity = quantity * 200;
    } else if (unit === '杯') {
        // 一杯约250ml
        adjustedQuantity = quantity * 250;
    }
    
    // 计算营养成分（基于每100g的含量）
    const factor = adjustedQuantity / 100;
    
    return {
        carbs: Math.round(foodData.carbs * factor * 10) / 10,
        protein: Math.round(foodData.protein * factor * 10) / 10,
        fat: Math.round(foodData.fat * factor * 10) / 10,
        fiber: Math.round(foodData.fiber * factor * 10) / 10,
        calories: Math.round(foodData.calories * factor)
    };
}

// 获取所有食物列表（用于下拉选择）
function getFoodList() {
    return Object.keys(FOOD_DATABASE).sort();
}

// 获取单位列表
function getUnitList() {
    return ['g', 'ml', '个', '只', '颗', '碗', '杯'];
}

// 获取餐次列表
function getMealTypeList() {
    return [
        { value: 'breakfast', label: '早餐' },
        { value: 'lunch', label: '午餐' },
        { value: 'dinner', label: '晚餐' },
        { value: 'snack', label: '加餐' }
    ];
}

// 格式化时间（HH:MM）
function formatTime(date = new Date()) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}