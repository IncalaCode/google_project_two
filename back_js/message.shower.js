class Notyfclass {
    constructor() {
        this.notyf = null;
        this.loadingNotification = null;

        document.addEventListener('DOMContentLoaded', () => {
            this.notyf = new Notyf({
                position: {
                    x: 'right',
                    y: 'top',
                },
                types: [
                    {
                        type: 'warning',
                        background: 'orange',
                        duration: 3000,
                        dismissible: true
                    },
                    {
                        type: 'error',
                        background: 'indianred',
                        duration: 3000,
                        dismissible: true
                    },
                    {
                        type: 'loading',
                        background: 'blue',
                        duration: 300000,
                        dismissible: false
                    },
                    {
                        type: 'success',
                        background: 'green',
                        duration: 3000,
                        dismissible: true
                    },
                    {
                        type: 'info',
                        background: '#21ff9f',
                        duration: 3000,
                        dismissible: true
                    }
                ]
            });
        });
    }

    showMessage(type, message, isLoading = false) {
        // dismiss all befor the opening
        this.notyf.dismiss(this.loadingNotification)

        this.loadingNotification = this.notyf.open({
            type: type,
            message: message + (isLoading ? `<div class="d-flex justify-content-end">
                <div class="spinner-border text-primary" style="height: 1rem; width: 1rem;" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
            </div>` : ''),
        });
        this.data_type(0)

    }

    data_type(value) {
        document.getElementById('display_list').setAttribute('data-type', value);
    }

    dismiss(type, Message) {
        if (this.loadingNotification) {
            setTimeout(() => {
                this.notyf.dismiss(this.loadingNotification);
                this.notyf.open({
                    type: type,
                    message: Message
                });
                this.data_type(1)
            }, 2000)

        }
    }
}

var NotyfService = new Notyfclass();

export default NotyfService;
