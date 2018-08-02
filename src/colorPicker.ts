import tinycolor from "tinycolor2";
import { debugLog } from "./main";

export class ColorPicker {
    public ctx: CanvasRenderingContext2D;
    public width: number;
    public height: number;
    public downFlags: {grad: boolean; hue: boolean; opacity: boolean} = {grad: false, hue: false, opacity: false};

    constructor(public canvas: HTMLCanvasElement, public color: tinycolorInstance) {
        this.ctx = canvas.getContext("2d")!;
        this.width = canvas.width;
        this.height = canvas.height;
        canvas.addEventListener("mousedown", this.down);
        canvas.addEventListener("mousemove", this.move);
        canvas.addEventListener("mouseup", this.up);
        canvas.addEventListener("mouseleave", this.leave);
        this.fillTransparent();
        this.drawHeader(color);
        this.drawGrad();
        this.drawSlider();
        this.drawCursors(color);
    }

    fillTransparent() {
        let i = 0;
        for (let x = 0; x < this.width; x += 5) {
            for (let y = 0; y < this.height; y += 5) {
                this.ctx.fillStyle = i % 2 == 0 && "white" || "gray";
                this.ctx.fillRect(x, y, 5, 5);
                i++;
            }
            i++;
        }
    }

    drawHeader(tmpColor: tinycolorInstance) {
        this.ctx.fillStyle = tmpColor.toString("rgb");
        this.ctx.fillRect(0, 0, this.width * 0.8, this.height * 0.2);
        this.ctx.fillStyle = this.color.toString("rgb");
        this.ctx.fillRect(this.width * 0.8, 0, this.width, this.height * 0.2);
    }

    drawGrad() {
        const toRightGrad = this.ctx.createLinearGradient(0, 0, this.width * 0.8, 0);
        toRightGrad.addColorStop(0, "white");
        toRightGrad.addColorStop(1, "hsla(0,50%,100%,0)");
        const toBottomGrad = this.ctx.createLinearGradient(0, this.height * 0.2, 0, this.height);
        toBottomGrad.addColorStop(0, "black");
        toBottomGrad.addColorStop(1, "transparent");

        this.ctx.fillStyle = `hsl(${this.color.toHsl().h}, 100%, 50%)`;
        this.ctx.fillRect(0, this.height * 0.2, this.width * 0.8, this.height);
        this.ctx.fillStyle = toRightGrad;
        this.ctx.fillRect(0, this.height * 0.2, this.width * 0.8, this.height);
        this.ctx.fillStyle = toBottomGrad;
        this.ctx.fillRect(0, this.height * 0.2, this.width * 0.8, this.height);
    }

    drawSlider() {
        const toBottomGrad = this.ctx.createLinearGradient(0, this.height * 0.2, 0, this.height);
        toBottomGrad.addColorStop(0, "hsl(0, 100%, 50%)");
        toBottomGrad.addColorStop(1/6, "hsl(60, 100%, 50%)");
        toBottomGrad.addColorStop(2/6, "hsl(120, 100%, 50%)");
        toBottomGrad.addColorStop(3/6, "hsl(180, 100%, 50%)");
        toBottomGrad.addColorStop(4/6, "hsl(240, 100%, 50%)");
        toBottomGrad.addColorStop(5/6, "hsl(300, 100%, 50%)");
        toBottomGrad.addColorStop(1, "hsl(360, 100%, 50%)");
        this.ctx.fillStyle = toBottomGrad;
        this.ctx.fillRect(this.width * 0.8, this.height * 0.2, this.width * 0.1, this.height * 0.8);

        const toBottomGrad2 = this.ctx.createLinearGradient(0, this.height * 0.2, 0, this.height);
        toBottomGrad2.addColorStop(0, "transparent");
        toBottomGrad2.addColorStop(1, `hsl(${this.color.toHsl().h}, 100%, 50%)`);
        this.ctx.fillStyle = toBottomGrad2;
        this.ctx.fillRect(this.width * 0.9, this.height * 0.2, this.width * 0.1, this.height * 0.8);
    }

    drawCursors(tmpColor: tinycolorInstance) {
        const gradStartX = 0;
        const gradStartY = this.height * 0.2;
        const gradRegionW = this.width * 0.8;
        const gradRegionH = this.height * 0.8;
        const s = tmpColor.toHsv().s;
        const v = tmpColor.toHsv().v;
        this.ctx.beginPath();
        this.ctx.arc(s * gradRegionW, v * gradRegionH + gradStartY, 5, 0, 2 * Math.PI);
        this.ctx.stroke();

        const h = tmpColor.toHsv().h / 360;
        const a = tmpColor.toHsv().a;
        this.ctx.strokeRect(gradRegionW, gradStartY + h * gradRegionH - 2, this.width * 0.1, 4);
        this.ctx.strokeRect(this.width * 0.9, gradStartY + a * gradRegionH - 2, this.width * 0.1, 4);
    }

    move = (event: MouseEvent) => {
        const x = event.offsetX;
        const y = event.offsetY;
        const hsva = this.color.toHsv();
        let tmpColor: tinycolorInstance = this.color;
        debugLog("colorPicker", `x: ${x}, y: ${y}, hsva: ${JSON.stringify(hsva)}`);
        if (y > this.height * 0.2) {
            if (x < this.width * 0.8 && this.downFlags.grad) {
                tmpColor = tinycolor.fromRatio({h: hsva.h / 360, s: x / (this.width * 0.8), v: (y - this.height * 0.2) / (this.height * 0.8), a: hsva.a});
            } else if (x < this.width * 0.9 && this.downFlags.hue) {
                tmpColor = tinycolor.fromRatio({h: (y - this.height * 0.2) / (this.height * 0.8), s: hsva.s, v: hsva.v, a: hsva.a});
            } else if (this.downFlags.opacity) {
                tmpColor = tinycolor.fromRatio({h: hsva.h / 360, s: hsva.s, v: hsva.v, a: (y - this.height * 0.2) / (this.height * 0.8)});
            }
        }
        this.fillTransparent();
        this.drawHeader(tmpColor);
        this.drawGrad();
        this.drawSlider();
        this.drawCursors(tmpColor);
    }

    down = (event: MouseEvent) => {
        const x = event.offsetX;
        const y = event.offsetY;
        if (y > this.height * 0.2) {
            if (x < this.width * 0.8) {
                this.downFlags.grad = true;
            } else if (x < this.width * 0.9) {
                this.downFlags.hue = true;
            } else {
                this.downFlags.opacity = true;
            }
        }
        this.move(event);
    }

    up = (event: MouseEvent) => {
        const x = event.offsetX;
        const y = event.offsetY;
        const hsva = this.color.toHsv();
        if (this.downFlags.grad) {
            this.color = tinycolor.fromRatio({h: hsva.h, s: x / (this.width * 0.8), v: (y - this.height * 0.2) / (this.height * 0.8), a: hsva.a});
        } else if (this.downFlags.hue) {
            this.color = tinycolor.fromRatio({h: (y - this.height * 0.2) / (this.height * 0.8), s: hsva.s, v: hsva.v, a: hsva.a});
        } else if (this.downFlags.opacity) {
            this.color = tinycolor.fromRatio({h: hsva.h, s: hsva.s, v: hsva.v, a: (y - this.height * 0.2) / (this.height * 0.8)});
        }
        this.downFlags.grad = this.downFlags.hue = this.downFlags.opacity = false;
        this.fillTransparent();
        this.drawHeader(this.color);
        this.drawGrad();
        this.drawSlider();
        this.drawCursors(this.color);
    }

    leave = () => {
        this.downFlags.grad = this.downFlags.hue = this.downFlags.opacity = false;
        this.fillTransparent();
        this.drawHeader(this.color);
        this.drawGrad();
        this.drawSlider();
        this.drawCursors(this.color);
    }
}