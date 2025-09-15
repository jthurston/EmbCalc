/**
 * Modern EmbCalc - Embroidery Price Calculator
 * Replaces jQuery Mobile with modern vanilla JavaScript
 */

class EmbroideryCalculator {
    constructor() {
        this.settings = {
            stitchRate: 0.50,    // per 1000 stitches
            appliqueRate: 1.00,  // per applique
            insuranceRate: 0.10  // 10% of blank cost
        };
        
        this.loadSettings();
        this.initializeEventListeners();
        this.populateSettingsForm();
    }

    // Load settings from localStorage with validation
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('embcalc-settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                this.settings = {
                    stitchRate: this.validateNumber(parsed.stitchRate, 0.50, 0, 10),
                    appliqueRate: this.validateNumber(parsed.appliqueRate, 1.00, 0, 50),
                    insuranceRate: this.validateNumber(parsed.insuranceRate, 0.10, 0, 1)
                };
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
            this.saveSettings(); // Save default settings
        }
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('embcalc-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showError('Settings could not be saved. Please check your browser settings.');
        }
    }

    // Validate and constrain numbers
    validateNumber(value, defaultValue, min = 0, max = Number.MAX_VALUE) {
        const num = parseFloat(value);
        if (isNaN(num) || num < min || num > max) {
            return defaultValue;
        }
        return num;
    }

    // Initialize all event listeners
    initializeEventListeners() {
        // Form submission
        const form = document.getElementById('embroidery-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.calculatePrice();
            });
        }

        // Settings modal
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeBtn = settingsModal?.querySelector('.close-btn');
        const cancelBtn = document.getElementById('cancel-settings');
        const settingsForm = document.getElementById('settings-form');

        settingsBtn?.addEventListener('click', () => this.openSettingsModal());
        closeBtn?.addEventListener('click', () => this.closeSettingsModal());
        cancelBtn?.addEventListener('click', () => this.closeSettingsModal());
        
        // Close modal on outside click
        settingsModal?.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.closeSettingsModal();
            }
        });

        // Settings form submission
        settingsForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettingsFromForm();
        });

        // Real-time input validation
        const inputs = form?.querySelectorAll('input[type="number"]');
        inputs?.forEach(input => {
            input.addEventListener('input', () => this.validateInput(input));
            input.addEventListener('blur', () => this.validateInput(input));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.calculatePrice();
                        break;
                    case ',':
                        e.preventDefault();
                        this.openSettingsModal();
                        break;
                }
            }
        });
    }

    // Validate individual input fields
    validateInput(input) {
        const value = parseFloat(input.value);
        const errorElement = document.getElementById(input.name + '-error');
        
        // Clear previous errors
        input.classList.remove('error');
        if (errorElement) {
            errorElement.textContent = '';
        }

        // Skip validation for optional empty fields
        if (input.value === '' && !input.required) {
            return true;
        }

        // Required field validation
        if (input.required && (input.value === '' || isNaN(value))) {
            this.showInputError(input, 'This field is required');
            return false;
        }

        // Min/max validation
        const min = parseFloat(input.min) || 0;
        const max = parseFloat(input.max) || Number.MAX_VALUE;

        if (!isNaN(value) && (value < min || value > max)) {
            this.showInputError(input, `Value must be between ${min} and ${max}`);
            return false;
        }

        return true;
    }

    // Show input-specific error
    showInputError(input, message) {
        input.classList.add('error');
        const errorElement = document.getElementById(input.name + '-error');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    // Calculate embroidery price
    async calculatePrice() {
        try {
            // Show loading state
            this.showLoading(true);

            // Get and validate inputs
            const formData = this.getFormData();
            if (!formData) {
                return; // Validation failed
            }

            // Perform calculations
            const results = this.performCalculations(formData);

            // Update UI with results
            this.displayResults(results, formData);

            // Show results section
            this.showResults(true);

        } catch (error) {
            console.error('Calculation error:', error);
            this.showError('An error occurred during calculation. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    // Get and validate form data
    getFormData() {
        const form = document.getElementById('embroidery-form');
        const formData = new FormData(form);
        
        // Validate all inputs
        const inputs = form.querySelectorAll('input[type="number"]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateInput(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.showError('Please correct the errors above before calculating.');
            return null;
        }

        // Extract validated data
        return {
            stitches: parseInt(formData.get('stitches')) || 0,
            items: parseInt(formData.get('items')) || 1,
            appliques: parseInt(formData.get('appliques')) || 0,
            blankCost: parseFloat(formData.get('blankCost')) || 0,
            designCost: parseFloat(formData.get('designCost')) || 0
        };
    }

    // Perform price calculations
    performCalculations(data) {
        const stitchCost = (data.stitches / 1000) * this.settings.stitchRate;
        const appliqueCost = data.appliques * this.settings.appliqueRate;
        const blankCost = data.blankCost;
        const insuranceCost = blankCost * this.settings.insuranceRate;
        const designCost = data.designCost;

        const perItemCost = stitchCost + appliqueCost + blankCost + insuranceCost + designCost;
        const totalCost = perItemCost * data.items;

        return {
            stitchCost,
            appliqueCost,
            blankCost,
            insuranceCost,
            designCost,
            perItemCost,
            totalCost
        };
    }

    // Display calculation results
    displayResults(results, formData) {
        // Update main price display
        this.updateElement('per-item-price', this.formatCurrency(results.perItemCost));
        this.updateElement('total-price', this.formatCurrency(results.totalCost));
        this.updateElement('item-count', formData.items.toString());

        // Update detailed breakdown
        this.updateElement('stitch-count', formData.stitches.toLocaleString());
        this.updateElement('stitch-rate', this.settings.stitchRate.toFixed(2));
        this.updateElement('stitch-total', results.stitchCost.toFixed(2));

        // Show/hide optional sections
        this.toggleSection('applique-breakdown', formData.appliques > 0);
        if (formData.appliques > 0) {
            this.updateElement('applique-count', formData.appliques.toString());
            this.updateElement('applique-rate', this.settings.appliqueRate.toFixed(2));
            this.updateElement('applique-total', results.appliqueCost.toFixed(2));
        }

        this.toggleSection('blank-breakdown', formData.blankCost > 0);
        if (formData.blankCost > 0) {
            this.updateElement('blank-price', results.blankCost.toFixed(2));
        }

        this.toggleSection('insurance-breakdown', formData.blankCost > 0);
        if (formData.blankCost > 0) {
            this.updateElement('insurance-rate', (this.settings.insuranceRate * 100).toFixed(1));
            this.updateElement('insurance-total', results.insuranceCost.toFixed(2));
        }

        this.toggleSection('design-breakdown', formData.designCost > 0);
        if (formData.designCost > 0) {
            this.updateElement('design-cost-display', results.designCost.toFixed(2));
        }
    }

    // Utility functions
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    toggleSection(id, show) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    showResults(show) {
        const results = document.getElementById('results-section');
        if (results) {
            results.style.display = show ? 'block' : 'none';
            if (show) {
                results.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    showError(message) {
        // Create or update error notification
        let errorDiv = document.getElementById('error-notification');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-notification';
            errorDiv.className = 'error-notification';
            errorDiv.setAttribute('role', 'alert');
            document.body.appendChild(errorDiv);
        }

        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    // Settings modal functions
    openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus first input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    populateSettingsForm() {
        const stitchRateInput = document.getElementById('stitch-rate-input');
        const appliqueRateInput = document.getElementById('applique-rate-input');
        const insuranceRateInput = document.getElementById('insurance-rate-input');

        if (stitchRateInput) stitchRateInput.value = this.settings.stitchRate.toFixed(2);
        if (appliqueRateInput) appliqueRateInput.value = this.settings.appliqueRate.toFixed(2);
        if (insuranceRateInput) insuranceRateInput.value = (this.settings.insuranceRate * 100).toFixed(1);
    }

    saveSettingsFromForm() {
        const stitchRate = parseFloat(document.getElementById('stitch-rate-input')?.value) || 0.50;
        const appliqueRate = parseFloat(document.getElementById('applique-rate-input')?.value) || 1.00;
        const insuranceRate = parseFloat(document.getElementById('insurance-rate-input')?.value) / 100 || 0.10;

        this.settings = {
            stitchRate: this.validateNumber(stitchRate, 0.50, 0, 10),
            appliqueRate: this.validateNumber(appliqueRate, 1.00, 0, 50),
            insuranceRate: this.validateNumber(insuranceRate, 0.10, 0, 1)
        };

        this.saveSettings();
        this.closeSettingsModal();
        
        // Show success message
        this.showSuccess('Settings saved successfully!');
    }

    showSuccess(message) {
        // Create or update success notification
        let successDiv = document.getElementById('success-notification');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'success-notification';
            successDiv.className = 'success-notification';
            successDiv.setAttribute('role', 'status');
            document.body.appendChild(successDiv);
        }

        successDiv.textContent = message;
        successDiv.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

// Initialize the calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EmbroideryCalculator();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmbroideryCalculator;
}