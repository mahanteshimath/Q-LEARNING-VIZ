// Q-Learning Visualization App
class QLearningApp {
    constructor() {
        this.gridSize = 5;
        this.actions = ['Up', 'Down', 'Left', 'Right'];
        this.actionDeltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        this.rewards = { step: -1, obstacle: -10, goal: 100 };
        
        // Environment state
        this.agentPos = [0, 0];
        this.goalPos = [4, 4];
        this.obstacles = new Set(['1,1', '2,3', '3,2']); // Default obstacles
        this.currentPath = [];
        
        // Learning parameters
        this.learningRate = 0.1;
        this.discountFactor = 0.9;
        this.epsilon = 0.1;
        this.maxSteps = 100;
        
        // State tracking
        this.qTable = {};
        this.episode = 0;
        this.steps = 0;
        this.totalReward = 0;
        this.episodeRewards = [];
        this.isRunning = false;
        this.isPaused = false;
        this.animationSpeed = 5;
        
        // Chart
        this.chart = null;
        
        // Current step info
        this.currentState = null;
        this.currentAction = null;
        this.currentReward = null;
        this.nextState = null;
        this.policyType = null;
        
        this.initializeQTable();
        this.initializeUI();
        this.initializeChart();
        this.renderGrid();
        this.renderQTable();
    }
    
    initializeQTable() {
        this.qTable = {};
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const state = `${row},${col}`;
                this.qTable[state] = [0, 0, 0, 0]; // [Up, Down, Left, Right]
            }
        }
    }
    
    initializeUI() {
        // Slider event listeners
        document.getElementById('learningRate').addEventListener('input', (e) => {
            this.learningRate = parseFloat(e.target.value);
            document.getElementById('learningRateValue').textContent = this.learningRate.toFixed(1);
        });
        
        document.getElementById('discountFactor').addEventListener('input', (e) => {
            this.discountFactor = parseFloat(e.target.value);
            document.getElementById('discountFactorValue').textContent = this.discountFactor.toFixed(1);
        });
        
        document.getElementById('epsilon').addEventListener('input', (e) => {
            this.epsilon = parseFloat(e.target.value);
            document.getElementById('epsilonValue').textContent = this.epsilon.toFixed(1);
        });
        
        document.getElementById('speed').addEventListener('input', (e) => {
            this.animationSpeed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = this.animationSpeed;
        });
        
        // Button event listeners
        document.getElementById('startBtn').addEventListener('click', () => this.startLearning());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseLearning());
        document.getElementById('stepBtn').addEventListener('click', () => this.stepForward());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    }
    
    initializeChart() {
        const ctx = document.getElementById('rewardChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Episode Reward',
                    data: [],
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Episode'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Reward'
                        }
                    }
                }
            }
        });
    }
    
    renderGrid() {
        const gridElement = document.getElementById('gridWorld');
        gridElement.innerHTML = '';
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const stateKey = `${row},${col}`;
                
                // Set cell type
                if (row === this.agentPos[0] && col === this.agentPos[1]) {
                    cell.classList.add('agent', 'current-position');
                } else if (row === this.goalPos[0] && col === this.goalPos[1]) {
                    cell.classList.add('goal');
                } else if (this.obstacles.has(stateKey)) {
                    cell.classList.add('obstacle');
                } else if (this.currentPath.some(pos => pos[0] === row && pos[1] === col)) {
                    cell.classList.add('path');
                }
                
                // Add policy arrow if not obstacle/agent/goal
                if (!this.obstacles.has(stateKey) && 
                    !(row === this.agentPos[0] && col === this.agentPos[1]) &&
                    !(row === this.goalPos[0] && col === this.goalPos[1])) {
                    this.addPolicyArrow(cell, stateKey);
                }
                
                // Click handler for environment editing
                cell.addEventListener('click', () => this.handleCellClick(row, col));
                
                gridElement.appendChild(cell);
            }
        }
    }
    
    addPolicyArrow(cell, stateKey) {
        const qValues = this.qTable[stateKey];
        const maxValue = Math.max(...qValues);
        const maxActionIndex = qValues.indexOf(maxValue);
        
        if (maxValue > 0) {
            const arrow = document.createElement('div');
            arrow.className = 'policy-arrow';
            const arrows = ['↑', '↓', '←', '→'];
            arrow.textContent = arrows[maxActionIndex];
            cell.appendChild(arrow);
        }
    }
    
    handleCellClick(row, col) {
        if (this.isRunning && !this.isPaused) return;
        
        const stateKey = `${row},${col}`;
        
        // If clicking on agent, allow moving it
        if (row === this.agentPos[0] && col === this.agentPos[1]) {
            // Could implement agent moving, for now just return
            return;
        }
        
        // If clicking on goal, allow moving it
        if (row === this.goalPos[0] && col === this.goalPos[1]) {
            // Could implement goal moving, for now just return
            return;
        }
        
        // Toggle obstacle
        if (this.obstacles.has(stateKey)) {
            this.obstacles.delete(stateKey);
        } else {
            // Don't place obstacle on agent or goal
            if (!(row === this.agentPos[0] && col === this.agentPos[1]) &&
                !(row === this.goalPos[0] && col === this.goalPos[1])) {
                this.obstacles.add(stateKey);
            }
        }
        
        this.renderGrid();
        this.renderQTable();
    }
    
    renderQTable() {
        const qTableElement = document.getElementById('qTable');
        qTableElement.innerHTML = '';
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const stateKey = `${row},${col}`;
                const qValues = this.qTable[stateKey];
                
                const cell = document.createElement('div');
                cell.className = 'q-cell';
                
                const valuesContainer = document.createElement('div');
                valuesContainer.className = 'q-values';
                
                // Add Q-values in order: Up, Down, Left, Right
                qValues.forEach((value, index) => {
                    const qValueElement = document.createElement('div');
                    qValueElement.className = 'q-value';
                    qValueElement.textContent = value.toFixed(2);
                    
                    // Highlight max value
                    if (value === Math.max(...qValues) && value > 0) {
                        qValueElement.classList.add('max-value');
                    }
                    
                    // Color coding based on value
                    const intensity = Math.min(Math.abs(value) / 10, 1);
                    if (value > 0) {
                        qValueElement.style.backgroundColor = `rgba(76, 175, 80, ${intensity * 0.3})`;
                    } else if (value < 0) {
                        qValueElement.style.backgroundColor = `rgba(244, 67, 54, ${intensity * 0.3})`;
                    }
                    
                    valuesContainer.appendChild(qValueElement);
                });
                
                cell.appendChild(valuesContainer);
                qTableElement.appendChild(cell);
            }
        }
    }
    
    isValidPosition(row, col) {
        return row >= 0 && row < this.gridSize && 
               col >= 0 && col < this.gridSize && 
               !this.obstacles.has(`${row},${col}`);
    }
    
    getValidActions(row, col) {
        const validActions = [];
        this.actionDeltas.forEach((delta, index) => {
            const newRow = row + delta[0];
            const newCol = col + delta[1];
            if (this.isValidPosition(newRow, newCol)) {
                validActions.push(index);
            }
        });
        return validActions;
    }
    
    selectAction(row, col) {
        const validActions = this.getValidActions(row, col);
        if (validActions.length === 0) return null;
        
        // Epsilon-greedy policy
        if (Math.random() < this.epsilon) {
            // Exploration: random action
            this.policyType = 'Exploration (Random)';
            return validActions[Math.floor(Math.random() * validActions.length)];
        } else {
            // Exploitation: best action
            this.policyType = 'Exploitation (Greedy)';
            const stateKey = `${row},${col}`;
            const qValues = this.qTable[stateKey];
            
            // Filter Q-values for valid actions only
            const validQValues = validActions.map(action => ({
                action: action,
                qValue: qValues[action]
            }));
            
            // Find action with max Q-value among valid actions
            const bestAction = validQValues.reduce((best, current) => 
                current.qValue > best.qValue ? current : best
            );
            
            return bestAction.action;
        }
    }
    
    getReward(newRow, newCol) {
        if (newRow === this.goalPos[0] && newCol === this.goalPos[1]) {
            return this.rewards.goal;
        }
        if (this.obstacles.has(`${newRow},${newCol}`)) {
            return this.rewards.obstacle;
        }
        return this.rewards.step;
    }
    
    updateQValue(state, action, reward, nextState) {
        const qValues = this.qTable[state];
        const nextQValues = this.qTable[nextState];
        const maxNextQ = Math.max(...nextQValues);
        
        // Q-learning update rule: Q(s,a) = Q(s,a) + α[r + γ*max Q(s',a') - Q(s,a)]
        const oldQValue = qValues[action];
        const newQValue = oldQValue + this.learningRate * 
            (reward + this.discountFactor * maxNextQ - oldQValue);
        
        qValues[action] = newQValue;
        
        // Update display
        this.updateAlgorithmInfo(state, action, reward, nextState);
    }
    
    updateAlgorithmInfo(state, action, reward, nextState) {
        this.currentState = state;
        this.currentAction = this.actions[action];
        this.currentReward = reward;
        this.nextState = nextState;
        
        document.getElementById('currentState').textContent = `(${state})`;
        document.getElementById('currentAction').textContent = this.actions[action];
        document.getElementById('currentReward').textContent = reward.toString();
        document.getElementById('nextState').textContent = `(${nextState})`;
        document.getElementById('policyType').textContent = this.policyType;
    }
    
    async runEpisode() {
        this.agentPos = [0, 0]; // Reset agent position
        this.steps = 0;
        this.totalReward = 0;
        this.currentPath = [];
        
        while (this.steps < this.maxSteps && this.isRunning) {
            if (this.isPaused) {
                await new Promise(resolve => {
                    const checkPause = () => {
                        if (!this.isPaused || !this.isRunning) resolve();
                        else setTimeout(checkPause, 100);
                    };
                    checkPause();
                });
            }
            
            if (!this.isRunning) break;
            
            const currentRow = this.agentPos[0];
            const currentCol = this.agentPos[1];
            const currentState = `${currentRow},${currentCol}`;
            
            // Check if reached goal
            if (currentRow === this.goalPos[0] && currentCol === this.goalPos[1]) {
                break;
            }
            
            // Select action
            const action = this.selectAction(currentRow, currentCol);
            if (action === null) break; // No valid actions
            
            // Take action
            const delta = this.actionDeltas[action];
            let newRow = currentRow + delta[0];
            let newCol = currentCol + delta[1];
            
            // Check if action leads to invalid position
            if (!this.isValidPosition(newRow, newCol)) {
                newRow = currentRow; // Stay in place
                newCol = currentCol;
            }
            
            const newState = `${newRow},${newCol}`;
            const reward = this.getReward(newRow, newCol);
            
            // Update Q-table
            this.updateQValue(currentState, action, reward, newState);
            
            // Update agent position and path
            this.agentPos = [newRow, newCol];
            this.currentPath.push([newRow, newCol]);
            this.totalReward += reward;
            this.steps++;
            
            // Update displays
            this.updateStats();
            this.renderGrid();
            this.renderQTable();
            
            // Animation delay
            const delay = Math.max(50, 1000 - (this.animationSpeed - 1) * 100);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Episode completed
        this.episode++;
        this.episodeRewards.push(this.totalReward);
        this.updateChart();
        this.checkConvergence();
    }
    
    updateStats() {
        document.getElementById('episodeCount').textContent = this.episode.toString();
        document.getElementById('stepCount').textContent = this.steps.toString();
        document.getElementById('totalReward').textContent = this.totalReward.toString();
    }
    
    updateChart() {
        this.chart.data.labels.push(this.episode);
        this.chart.data.datasets[0].data.push(this.totalReward);
        
        // Keep only last 50 episodes for readability
        if (this.chart.data.labels.length > 50) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
        }
        
        this.chart.update('none');
    }
    
    checkConvergence() {
        const recentRewards = this.episodeRewards.slice(-10);
        if (recentRewards.length >= 10) {
            const avgReward = recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;
            const variance = recentRewards.reduce((sum, reward) => 
                sum + Math.pow(reward - avgReward, 2), 0) / recentRewards.length;
            
            const convergenceElement = document.getElementById('convergenceStatus');
            if (variance < 100) { // Low variance indicates convergence
                convergenceElement.textContent = 'Converged';
                convergenceElement.className = 'status status--success';
            } else {
                convergenceElement.textContent = 'Learning...';
                convergenceElement.className = 'status status--info';
            }
        }
    }
    
    async startLearning() {
        this.isRunning = true;
        this.isPaused = false;
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        while (this.isRunning) {
            await this.runEpisode();
            if (!this.isRunning) break;
        }
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }
    
    pauseLearning() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
    }
    
    async stepForward() {
        if (this.isRunning) return;
        
        // Run one step
        this.isRunning = true;
        const currentRow = this.agentPos[0];
        const currentCol = this.agentPos[1];
        
        // Check if at goal or max steps
        if ((currentRow === this.goalPos[0] && currentCol === this.goalPos[1]) || 
            this.steps >= this.maxSteps) {
            this.episode++;
            this.episodeRewards.push(this.totalReward);
            this.updateChart();
            this.agentPos = [0, 0];
            this.steps = 0;
            this.totalReward = 0;
            this.currentPath = [];
        } else {
            const currentState = `${currentRow},${currentCol}`;
            const action = this.selectAction(currentRow, currentCol);
            
            if (action !== null) {
                const delta = this.actionDeltas[action];
                let newRow = currentRow + delta[0];
                let newCol = currentCol + delta[1];
                
                if (!this.isValidPosition(newRow, newCol)) {
                    newRow = currentRow;
                    newCol = currentCol;
                }
                
                const newState = `${newRow},${newCol}`;
                const reward = this.getReward(newRow, newCol);
                
                this.updateQValue(currentState, action, reward, newState);
                this.agentPos = [newRow, newCol];
                this.currentPath.push([newRow, newCol]);
                this.totalReward += reward;
                this.steps++;
            }
        }
        
        this.isRunning = false;
        this.updateStats();
        this.renderGrid();
        this.renderQTable();
        this.checkConvergence();
    }
    
    reset() {
        this.isRunning = false;
        this.isPaused = false;
        
        // Reset environment
        this.agentPos = [0, 0];
        this.episode = 0;
        this.steps = 0;
        this.totalReward = 0;
        this.episodeRewards = [];
        this.currentPath = [];
        
        // Reset Q-table
        this.initializeQTable();
        
        // Reset UI
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        
        // Clear algorithm info
        document.getElementById('currentState').textContent = '-';
        document.getElementById('currentAction').textContent = '-';
        document.getElementById('currentReward').textContent = '-';
        document.getElementById('nextState').textContent = '-';
        document.getElementById('policyType').textContent = '-';
        
        // Reset convergence status
        document.getElementById('convergenceStatus').textContent = 'Ready';
        document.getElementById('convergenceStatus').className = 'status status--info';
        
        // Clear chart
        this.chart.data.labels = [];
        this.chart.data.datasets[0].data = [];
        this.chart.update();
        
        // Update displays
        this.updateStats();
        this.renderGrid();
        this.renderQTable();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.qLearningApp = new QLearningApp();
});