// AI健康助手模块
class AIHealthAssistant {
    constructor() {
        this.apiKey = null;
        this.conversationHistory = [];
        this.currentMember = null;
        this.selectedFile = null;
        this.isRecording = false;
        this.recognition = null;
        this.init();
    }

    // 初始化模块
    init() {
        this.loadApiKey();
        this.bindEvents();
        this.bindToggleApiConfig();
        this.loadConversationHistory();
        this.updateUI();
    }

    // 加载API密钥
    loadApiKey() {
        this.apiKey = localStorage.getItem('zhipu_api_key');
        return this.apiKey;
    }

    // 保存API密钥
    saveApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('zhipu_api_key', apiKey);
        this.updateUI();
        this.showNotification('API密钥已保存', 'success');
    }

    // 清除API密钥
    clearApiKey() {
        this.apiKey = null;
        localStorage.removeItem('zhipu_api_key');
        this.updateUI();
        this.showNotification('API密钥已清除', 'info');
    }

    // 绑定事件
    bindEvents() {
        // 保存API密钥按钮
        document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
            const apiKey = document.getElementById('apiKeyInput').value.trim();
            if (!apiKey) {
                this.showNotification('请输入API密钥', 'error');
                return;
            }
            this.saveApiKey(apiKey);
            document.getElementById('apiKeyInput').value = '';
        });

        // 清除API密钥按钮
        document.getElementById('clearApiKeyBtn').addEventListener('click', () => {
            if (confirm('确定要清除API密钥吗？')) {
                this.clearApiKey();
            }
        });

        // 发送消息按钮
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendMessage());

        // 聊天输入框回车发送
        document.getElementById('chatInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 新对话按钮
        document.getElementById('newChatBtn').addEventListener('click', () => this.startNewConversation());

        // 清空对话按钮
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            if (confirm('确定要清空当前对话吗？')) {
                this.clearConversation();
            }
        });

        // 监听成员选择变化（使用下拉菜单）
        const memberSelect = document.getElementById('memberSelect');
        if (memberSelect) {
            memberSelect.addEventListener('change', (e) => {
                this.currentMember = e.target.value ? this.getMemberInfo(e.target.value) : null;
            });
        }

        // ===== 文件上传功能 =====
        const uploadBtn = document.getElementById('uploadFileBtn');
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        const filePreviewName = document.getElementById('filePreviewName');
        const removeFileBtn = document.getElementById('removeFileBtn');

        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.selectedFile = file;
                filePreviewName.textContent = file.name;

                // 判断文件图标
                let icon = 'fa-file';
                if (file.type.startsWith('image/')) icon = 'fa-file-image';
                else if (file.type === 'application/pdf') icon = 'fa-file-pdf';
                else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) icon = 'fa-file-word';
                else if (file.name.endsWith('.txt')) icon = 'fa-file-alt';
                filePreview.querySelector('i').className = `fas ${icon}`;

                filePreview.style.display = 'block';
                this.showNotification(`已选择文件：${file.name}`, 'success');
            }
        });

        removeFileBtn.addEventListener('click', () => {
            this.selectedFile = null;
            fileInput.value = '';
            filePreview.style.display = 'none';
        });

        // ===== 语音输入功能 =====
        const voiceBtn = document.getElementById('voiceInputBtn');
        const voiceIndicator = document.getElementById('voiceIndicator');

        // 检查浏览器是否支持语音识别
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'zh-CN';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;

            this.recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                const chatInput = document.getElementById('chatInput');
                chatInput.value = transcript;
            };

            this.recognition.onerror = (event) => {
                this.stopRecording();
                if (event.error === 'not-allowed') {
                    this.showNotification('请允许麦克风权限', 'error');
                } else if (event.error !== 'aborted') {
                    this.showNotification('语音识别出错：' + event.error, 'error');
                }
            };

            this.recognition.onend = () => {
                // 如果还在录制状态（非手动停止），自动重启
                if (this.isRecording) {
                    try { this.recognition.start(); } catch(e) {}
                }
            };

            voiceBtn.addEventListener('click', () => {
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    this.startRecording();
                }
            });
        } else {
            // 浏览器不支持语音识别
            voiceBtn.addEventListener('click', () => {
                this.showNotification('您的浏览器不支持语音输入，请使用Chrome浏览器', 'error');
            });
            voiceBtn.style.opacity = '0.4';
            voiceBtn.style.cursor = 'not-allowed';
        }
    }

    // 获取成员信息
    getMemberInfo(memberId) {
        const members = JSON.parse(localStorage.getItem('family_members') || '[]');
        return members.find(member => member.id === memberId);
    }

    // 发送消息
    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        // 处理文件
        if (this.selectedFile) {
            if (!this.apiKey) {
                this.showNotification('请先配置API密钥', 'error');
                return;
            }

            const file = this.selectedFile;

            if (file.type.startsWith('image/')) {
                // 图片：读取为 base64 发送
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64 = e.target.result;
                    const fileMsg = `【上传了图片文件：${file.name}】\n这是一张图片，请帮我分析其中的内容（如检查报告、处方、体检单等）。`;
                    
                    this.addMessageToUI('user', fileMsg, true);
                    input.value = '';
                    this.clearFilePreview();

                    const thinkingId = this.showThinkingIndicator();
                    try {
                        // 如果API支持视觉，发送图片
                        const context = this.buildContext();
                        const response = await this.callDeepSeekAPI(fileMsg, context);
                        this.removeThinkingIndicator(thinkingId);
                        this.addMessageToUI('assistant', response);
                        this.saveToConversationHistory('user', fileMsg);
                        this.saveToConversationHistory('assistant', response);
                    } catch (error) {
                        this.removeThinkingIndicator(thinkingId);
                        this.showNotification(`发送失败: ${error.message}`, 'error');
                    }
                };
                reader.readAsDataURL(file);
            } else {
                // 非图片文件：读取文本内容
                const textContent = await this.readFileContent(file);
                const fileMsg = `【上传了文件：${file.name}】\n文件内容如下：\n${textContent}\n\n请根据以上文件内容回答我的问题。`;

                this.addMessageToUI('user', fileMsg, true);
                input.value = '';
                this.clearFilePreview();

                const thinkingId = this.showThinkingIndicator();
                try {
                    const context = this.buildContext();
                    const response = await this.callDeepSeekAPI(message ? `${message}\n\n${fileMsg}` : fileMsg, context);
                    this.removeThinkingIndicator(thinkingId);
                    this.addMessageToUI('assistant', response);
                    this.saveToConversationHistory('user', fileMsg);
                    this.saveToConversationHistory('assistant', response);
                } catch (error) {
                    this.removeThinkingIndicator(thinkingId);
                    this.showNotification(`发送失败: ${error.message}`, 'error');
                }
            }
            return;
        }

        if (!message) {
            this.showNotification('请输入消息或上传文件', 'error');
            return;
        }

        if (!this.apiKey) {
            this.showNotification('请先配置API密钥', 'error');
            return;
        }

        // 添加用户消息到界面
        this.addMessageToUI('user', message);
        input.value = '';
        input.focus();

        // 显示AI正在思考
        const thinkingId = this.showThinkingIndicator();

        try {
            // 构建上下文
            const context = this.buildContext();
            
            // 调用DeepSeek API
            const response = await this.callDeepSeekAPI(message, context);
            
            // 移除思考指示器
            this.removeThinkingIndicator(thinkingId);
            
            // 添加AI回复到界面
            this.addMessageToUI('assistant', response);
            
            // 保存到对话历史
            this.saveToConversationHistory('user', message);
            this.saveToConversationHistory('assistant', response);
            
        } catch (error) {
            this.removeThinkingIndicator(thinkingId);
            this.showNotification(`发送失败: ${error.message}`, 'error');
            console.error('API调用失败:', error);
        }
    }

    // 构建上下文信息
    buildContext() {
        const context = {
            systemPrompt: `你是一位专业的AI健康助手，请根据以下信息为用户提供健康咨询：

用户信息：${this.currentMember ? `${this.currentMember.name}，${this.currentMember.age}岁，${this.currentMember.gender}` : '未选择家庭成员'}

请遵循以下原则：
1. 提供准确、科学的健康信息
2. 强调不能替代专业医疗建议
3. 对于严重症状，建议立即就医
4. 提供实用的生活方式建议
5. 使用友好、易懂的语言

请根据用户的问题提供针对性的回答。`,
            healthHistory: this.getHealthHistory(),
            conversationHistory: this.conversationHistory.slice(-10) // 最近10条对话
        };

        return context;
    }

    // 获取健康历史记录
    getHealthHistory() {
        if (!this.currentMember) return '无健康记录';
        
        const healthRecords = JSON.parse(localStorage.getItem('health_records') || '[]');
        const memberRecords = healthRecords.filter(record => record.memberId === this.currentMember.id);
        
        if (memberRecords.length === 0) return '无健康记录';
        
        const summary = memberRecords.slice(-5).map(record => {
            const date = new Date(record.timestamp).toLocaleDateString();
            return `${date}: ${record.type} - ${record.value}${record.unit || ''}`;
        }).join('; ');
        
        return `最近健康记录：${summary}`;
    }

    // 调用智谱 API
    async callDeepSeekAPI(message, context) {
        const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        
        // 构建消息数组
        const messages = [
            {
                role: 'system',
                content: context.systemPrompt
            },
            ...context.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            {
                role: 'user',
                content: message
            }
        ];

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // 添加消息到UI
    addMessageToUI(role, content, isFile = false) {
        const chatMessages = document.getElementById('chatMessages');
        
        // 移除欢迎消息（如果是第一条消息）
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage && this.conversationHistory.length === 0) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;
        
        const icon = role === 'user' ? 'fas fa-user' : 'fas fa-robot';
        const name = role === 'user' ? '您' : 'AI助手';
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <i class="${icon}"></i>
                <span class="message-sender">${name}</span>
                <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="message-content ${isFile ? 'file-message' : ''}">${this.formatMessageContent(content)}</div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 读取文件内容（文本类）
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                let content = e.target.result;
                // 截断过长内容，避免超出token限制
                if (content.length > 8000) {
                    content = content.substring(0, 8000) + '\n\n...（文件内容过长，仅显示前8000字符）';
                }
                resolve(content);
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    // 清除文件预览
    clearFilePreview() {
        this.selectedFile = null;
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
    }

    // 开始录音
    startRecording() {
        if (!this.recognition) return;
        this.isRecording = true;
        this.recognition.start();
        
        const voiceBtn = document.getElementById('voiceInputBtn');
        const voiceIndicator = document.getElementById('voiceIndicator');
        voiceBtn.classList.add('recording');
        voiceBtn.title = '停止录音';
        voiceIndicator.style.display = 'flex';
        voiceIndicator.querySelector('span').textContent = '正在录音...点击麦克风停止';
    }

    // 停止录音
    stopRecording() {
        if (!this.recognition) return;
        this.isRecording = false;
        this.recognition.stop();
        
        const voiceBtn = document.getElementById('voiceInputBtn');
        const voiceIndicator = document.getElementById('voiceIndicator');
        voiceBtn.classList.remove('recording');
        voiceBtn.title = '语音输入';
        voiceIndicator.style.display = 'none';
        
        const chatInput = document.getElementById('chatInput');
        if (chatInput.value.trim()) {
            this.showNotification('语音识别完成', 'success');
        }
    }

    // 格式化消息内容
    formatMessageContent(content) {
        // 将换行符转换为<br>
        let formatted = content.replace(/\n/g, '<br>');
        
        // 添加基本的Markdown支持
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // 检测并格式化列表
        formatted = formatted.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
        if (formatted.includes('<li>')) {
            formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }
        
        return formatted;
    }

    // 显示思考指示器
    showThinkingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'chat-message assistant-message thinking';
        thinkingDiv.id = 'thinking-indicator';
        
        thinkingDiv.innerHTML = `
            <div class="message-header">
                <i class="fas fa-robot"></i>
                <span class="message-sender">AI助手</span>
            </div>
            <div class="message-content">
                <div class="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return 'thinking-indicator';
    }

    // 移除思考指示器
    removeThinkingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.remove();
        }
    }

    // 保存到对话历史
    saveToConversationHistory(role, content) {
        this.conversationHistory.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });
        
        // 限制历史记录长度
        if (this.conversationHistory.length > 50) {
            this.conversationHistory = this.conversationHistory.slice(-50);
        }
        
        this.saveConversationHistory();
    }

    // 加载对话历史
    loadConversationHistory() {
        const saved = localStorage.getItem('ai_conversation_history');
        if (saved) {
            this.conversationHistory = JSON.parse(saved);
        }
    }

    // 保存对话历史
    saveConversationHistory() {
        localStorage.setItem('ai_conversation_history', JSON.stringify(this.conversationHistory));
    }

    // 开始新对话
    startNewConversation() {
        if (this.conversationHistory.length > 0) {
            if (confirm('确定要开始新的对话吗？当前对话历史将被保存。')) {
                this.conversationHistory = [];
                this.saveConversationHistory();
                this.clearChatUI();
                this.showNotification('已开始新对话', 'success');
            }
        }
    }

    // 清空对话
    clearConversation() {
        this.conversationHistory = [];
        this.saveConversationHistory();
        this.clearChatUI();
        this.showNotification('对话已清空', 'success');
    }

    // 清空聊天UI
    clearChatUI() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-robot"></i>
                <h4>欢迎使用AI健康助手！</h4>
                <p>我是您的AI健康助手，可以为您提供：</p>
                <ul>
                    <li>健康知识解答</li>
                    <li>症状初步分析</li>
                    <li>生活方式建议</li>
                    <li>用药注意事项</li>
                </ul>
                <p>请先配置API密钥，然后开始对话。</p>
            </div>
        `;
    }

    // 更新UI状态
    updateUI() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const saveBtn = document.getElementById('saveApiKeyBtn');
        const clearBtn = document.getElementById('clearApiKeyBtn');
        const sendBtn = document.getElementById('sendMessageBtn');
        const apiConfigSection = document.getElementById('apiConfigSection');
        const toggleBtn = document.getElementById('toggleApiConfigBtn');
        
        if (this.apiKey) {
            apiKeyInput.placeholder = 'API密钥已配置（输入新密钥可更新）';
            saveBtn.textContent = '更新密钥';
            clearBtn.disabled = false;
            sendBtn.disabled = false;
            // 已配置密钥：隐藏配置区
            if (apiConfigSection) apiConfigSection.style.display = 'none';
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-key"></i> 已配置';
                toggleBtn.style.color = '#28a745';
            }
        } else {
            apiKeyInput.placeholder = '请输入智谱 API密钥';
            saveBtn.textContent = '保存密钥';
            clearBtn.disabled = true;
            sendBtn.disabled = true;
            // 未配置密钥：显示配置区
            if (apiConfigSection) apiConfigSection.style.display = 'block';
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i class="fas fa-key"></i> 配置密钥';
                toggleBtn.style.color = '';
            }
        }
    }

    // 绑定切换API配置区域按钮
    bindToggleApiConfig() {
        const toggleBtn = document.getElementById('toggleApiConfigBtn');
        const apiConfigSection = document.getElementById('apiConfigSection');
        if (!toggleBtn || !apiConfigSection) return;
        toggleBtn.addEventListener('click', () => {
            const isHidden = apiConfigSection.style.display === 'none';
            apiConfigSection.style.display = isHidden ? 'block' : 'none';
        });
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// 初始化AI健康助手
let aiAssistant = null;

// 当DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    aiAssistant = new AIHealthAssistant();
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIHealthAssistant;
}