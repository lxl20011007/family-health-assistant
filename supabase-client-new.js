                id: item.id,
                memberId: item.member_id,
                name: item.name,
                dosage: item.dosage,
                times: item.times ? item.times.split(',') : [],
                notes: item.notes,
                active: item.active,
                createdAt: item.created_at
            }));
        } catch (error) {
            console.error('Supabase: 获取用药提醒失败', error);
            return [];
        }
    }

    async addMedication(medication) {
        if (!this.supabase || !this.isAuthenticated) {
            throw new Error('未登录或 Supabase 未初始化');
        }

        try {
            const cloudRecord = {
                id: medication.id || Date.now().toString(),
                user_id: this.currentUser.id,
                member_id: medication.memberId,
                name: medication.name,
                dosage: medication.dosage,
                times: medication.times.join(','),
                notes: medication.notes || '',
                active: medication.active !== false,
                created_at: medication.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('medications')
                .insert(cloudRecord)
                .select()
                .single();

            if (error) throw error;
            
            console.log('Supabase: 用药提醒添加成功', data.id);
            return data.id;
        } catch (error) {
            console.error('Supabase: 添加用药提醒失败', error);
            throw error;
        }
    }

    async updateMedication(id, updates) {
        if (!this.supabase || !this.isAuthenticated) {
            throw new Error('未登录或 Supabase 未初始化');
        }

        try {
            const cloudUpdates = {
                name: updates.name,
                dosage: updates.dosage,
                times: updates.times ? updates.times.join(',') : '',
                notes: updates.notes,
                active: updates.active,
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('medications')
                .update(cloudUpdates)
                .eq('id', id)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            
            console.log('Supabase: 用药提醒更新成功', id);
            return true;
        } catch (error) {
            console.error('Supabase: 更新用药提醒失败', error);
            throw error;
        }
    }

    async deleteMedication(id) {
        if (!this.supabase || !this.isAuthenticated) {
            throw new Error('未登录或 Supabase 未初始化');
        }

        try {
            const { error } = await this.supabase
                .from('medications')
                .delete()
                .eq('id', id)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            
            console.log('Supabase: 用药提醒删除成功', id);
            return true;
        } catch (error) {
            console.error('Supabase: 删除用药提醒失败', error);
            throw error;
        }
    }

    // ==================== 实时同步方法 ====================

    // 启动实时订阅
    startRealtimeSubscriptions() {
        if (!this.supabase || !this.isAuthenticated) {
            return;
        }

        console.log('Supabase: 启动实时订阅');

        // 订阅家庭成员表
        const familyChannel = this.supabase
            .channel('family-members-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'family_members',
                filter: `user_id=eq.${this.currentUser.id}`
            }, (payload) => {
                console.log('Supabase: 家庭成员表变化', payload);
                this.notifyDataListeners('family_members', payload);
            })
            .subscribe();

        // 订阅健康记录表
        const healthChannel = this.supabase
            .channel('health-records-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'health_records',
                filter: `user_id=eq.${this.currentUser.id}`
            }, (payload) => {
                console.log('Supabase: 健康记录表变化', payload);
                this.notifyDataListeners('health_records', payload);
            })
            .subscribe();

        // 订阅饮食记录表
        const dietChannel = this.supabase
            .channel('diet-records-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'diet_records',
                filter: `user_id=eq.${this.currentUser.id}`
            }, (payload) => {
                console.log('Supabase: 饮食记录表变化', payload);
                this.notifyDataListeners('diet_records', payload);
            })
            .subscribe();

        // 订阅运动记录表
        const exerciseChannel = this.supabase
            .channel('exercise-records-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'exercise_records',
                filter: `user_id=eq.${this.currentUser.id}`
            }, (payload) => {
                console.log('Supabase: 运动记录表变化', payload);
                this.notifyDataListeners('exercise_records', payload);
            })
            .subscribe();

        // 订阅用药提醒表
        const medicationChannel = this.supabase
            .channel('medications-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'medications',
                filter: `user_id=eq.${this.currentUser.id}`
            }, (payload) => {
                console.log('Supabase: 用药提醒表变化', payload);
                this.notifyDataListeners('medications', payload);
            })
            .subscribe();

        // 订阅 AI 聊天会话表
        const aiSessionsChannel = this.supabase
            .channel('ai-chat-sessions-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'ai_chat_sessions',
                filter: `user_id=eq.${this.currentUser.id}`
            }, (payload) => {
                console.log('Supabase: AI 聊天会话表变化', payload);
                this.notifyDataListeners('ai_chat_sessions', payload);
            })
            .subscribe();

        // 订阅 AI 聊天消息表
        const aiMessagesChannel = this.supabase
            .channel('ai-chat-messages-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'ai_chat_messages',
                filter: `user_id=eq.${this.currentUser.id}`
            }, (payload) => {
                console.log('Supabase: AI 聊天消息表变化', payload);
                this.notifyDataListeners('ai_chat_messages', payload);
            })
            .subscribe();

        this.realtimeChannels = [
            familyChannel,
            healthChannel,
            dietChannel,
            exerciseChannel,
            medicationChannel,
            aiSessionsChannel,
            aiMessagesChannel
        ];
    }

    // 停止实时订阅
    stopRealtimeSubscriptions() {
        console.log('Supabase: 停止实时订阅');
        
        this.realtimeChannels.forEach(channel => {
            if (channel) {
                this.supabase.removeChannel(channel);
            }
        });
        
        this.realtimeChannels = [];
    }

    // 添加数据变化监听器
    onDataChange(callback) {
        this.dataListeners.push(callback);
    }

    // 通知数据监听器
    notifyDataListeners(table, payload) {
        this.dataListeners.forEach(listener => {
            try {
                listener(table, payload);
            } catch (error) {
                console.error('Supabase: 数据监听器错误', error);
            }
        });
    }

    // ==================== 工具方法 ====================

    // 获取用户信息
    getUserInfo() {
        if (!this.currentUser) {
            return null;
        }

        return {
            id: this.currentUser.id,
            email: this.currentUser.email,
            name: this.currentUser.user_metadata?.name || this.currentUser.email.split('@')[0],
            avatar: this.currentUser.user_metadata?.avatar_url
        };
    }

    // 检查连接状态
    async checkConnection() {
        if (!this.supabase) {
            return { connected: false, error: 'Supabase 未初始化' };
        }

        try {
            const { data, error } = await this.supabase
                .from('family_members')
                .select('count')
                .limit(1);

            if (error) throw error;
            
            return { connected: true };
        } catch (error) {
            console.error('Supabase: 连接检查失败', error);
            return { connected: false, error: error.message };
        }
    }

    // 清空用户数据（登出时使用）
    clearUserData() {
        // 清除本地存储的用户数据
        localStorage.removeItem('members');
        localStorage.removeItem('health_records');
        localStorage.removeItem('diet_records');
        localStorage.removeItem('exercises');
        localStorage.removeItem('medications');
        
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    // ==================== AI 聊天相关方法 ====================

    // 获取 AI 聊天会话
    async getAIChatSessions() {
        if (!this.supabase || !this.isAuthenticated) {
            return [];
        }

        try {
            const { data, error } = await this.supabase
                .from('ai_chat_sessions')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            return data.map(item => ({
                id: item.id,
                memberId: item.member_id,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            }));
        } catch (error) {
            console.error('Supabase: 获取 AI 聊天会话失败', error);
            return [];
        }
    }

    // 创建 AI 聊天会话
    async createAIChatSession(memberId = null) {
        if (!this.supabase || !this.isAuthenticated) {
            throw new Error('未登录或 Supabase 未初始化');
        }

        try {
            const sessionData = {
                user_id: this.currentUser.id,
                member_id: memberId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('ai_chat_sessions')
                .insert(sessionData)
                .select()
                .single();

            if (error) throw error;
            
            console.log('Supabase: AI 聊天会话创建成功', data.id);
            return data.id;
        } catch (error) {
            console.error('Supabase: 创建 AI 聊天会话失败', error);
            throw error;
        }
    }

    // 获取 AI 聊天消息
    async getAIChatMessages(sessionId) {
        if (!this.supabase || !this.isAuthenticated) {
            return [];
        }

        try {
            const { data, error } = await this.supabase
                .from('ai_chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            
            return data.map(item => ({
                id: item.id,
                sessionId: item.session_id,
                role: item.role,
                content: item.content,
                createdAt: item.created_at
            }));
        } catch (error) {
            console.error('Supabase: 获取 AI 聊天消息失败', error);
            return [];
        }
    }

    // 添加 AI 聊天消息
    async addAIChatMessage(sessionId, role, content) {
        if (!this.supabase || !this.isAuthenticated) {
            throw new Error('未登录或 Supabase 未初始化');
        }

        try {
            const messageData = {
                session_id: sessionId,
                user_id: this.currentUser.id,
                role: role,
                content: content,
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('ai_chat_messages')
                .insert(messageData)
                .select()
                .single();

            if (error) throw error;
            
            console.log('Supabase: AI 聊天消息添加成功', data.id);
            return data.id;
        } catch (error) {
            console.error('Supabase: 添加 AI 聊天消息失败', error);
            throw error;
        }
    }

    // 删除 AI 聊天会话
    async deleteAIChatSession(sessionId) {
        if (!this.supabase || !this.isAuthenticated) {
            throw new Error('未登录或 Supabase 未初始化');
        }

        try {
            const { error } = await this.supabase
                .from('ai_chat_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            
            console.log('Supabase: AI 聊天会话删除成功', sessionId);
            return true;
        } catch (error) {
            console.error('Supabase: 删除 AI 聊天会话失败', error);
            throw error;
        }
    }

    // 批量导入本地数据到云端
    async importLocalDataToCloud() {
        if (!this.supabase || !this.isAuthenticated) {
            throw new Error('未登录或 Supabase 未初始化');
        }

        console.log('Supabase: 开始导入本地数据到云端');

        try {
            // 导入家庭成员
            const localMembers = JSON.parse(localStorage.getItem('members') || '[]');
            for (const member of localMembers) {
                await this.addMember(member);
            }

            // 导入健康记录
            const localHealthRecords = JSON.parse(localStorage.getItem('health_records') || '[]');
            for (const record of localHealthRecords) {
                await this.addHealthRecord(record);
            }

            // 导入饮食记录
            const localDietRecords = JSON.parse(localStorage.getItem('diet_records') || '[]');
            for (const record of localDietRecords) {
                await this.addDietRecord(record);
            }

            // 导入运动记录
            const localExercises = JSON.parse(localStorage.getItem('exercises') || '[]');
            for (const record of localExercises) {
                await this.addExerciseRecord(record);
            }

            // 导入用药提醒
            const localMedications = JSON.parse(localStorage.getItem('medications') || '[]');
            for (const record of localMedications) {
                await this.addMedication(record);
            }

            console.log('Supabase: 本地数据导入完成');
            return { success: true, count: localMembers.length + localHealthRecords.length + localDietRecords.length + localExercises.length + localMedications.length };
        } catch (error) {
            console.error('Supabase: 导入本地数据失败', error);
            return { success: false, error: error.message };
        }
    }
}

// 创建全局实例
window.supabaseManager = new SupabaseManager();
