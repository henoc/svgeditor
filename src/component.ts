export interface Component {
    render(): void;
}

export interface WindowComponent extends Component {
    onClose(): void;
}
