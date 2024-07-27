import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Tesseract from 'tesseract.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AppComponent implements OnInit {
  model: cocoSsd.ObjectDetection;
  worker: Tesseract.Worker;
  imageSrc: string;
  carDetections: any[] = [];
  licensePlates: any[] = [];
  @ViewChild('loadingImage', { static: false }) inputImage: ElementRef<HTMLImageElement>;
  @ViewChild('canvas', { static: false }) canvas: ElementRef<HTMLCanvasElement>;


  constructor() { }

  async ngOnInit() {
    this.model = await cocoSsd.load();
    this.worker = await Tesseract.createWorker('eng', undefined, {
      logger: m => console.log(m),
    });
    this.worker.setParameters(
      {
        'tessedit_pageseg_mode': Tesseract.PSM.SINGLE_CHAR,
      },
    );
  }

  loadImage(event: any) {
    this.carDetections = this.licensePlates = []; 
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imageSrc = e.target.result;
      setTimeout(() => this.detectCars(), 100);
    };
    reader.readAsDataURL(file);
  }

  async onImageLoad() {
    await this.detectCars();
  }

  private async detectCars() {
    const image = this.inputImage.nativeElement;
    const predictions = await this.model.detect(image);
    this.carDetections = predictions.filter(prediction => prediction.class === 'car');
    this.drawDetections();
    this.carDetections.forEach(car => this.detectLicensePlate(image, car.bbox));
  }

  private drawDetections() {
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d');
    const image = this.inputImage.nativeElement;
    
    if (context) {
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0, image.width, image.height);

      context.lineWidth = 2;
      context.strokeStyle = 'green';
      context.fillStyle = 'green';
      
      this.carDetections.forEach(car => {
        const [x, y, width, height] = car.bbox;
        context.strokeRect(x, y, width, height);
        context.fillText('Car', x, y + 10);
      });
    }
  }

  private async detectLicensePlate(image: HTMLImageElement, bbox: [number, number, number, number]) {
    const [x, y, width, height] = bbox;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, x, y, width, height, 0, 0, width, height);

      const imageData = context.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const v = (0.2126 * r + 0.7152 * g + 0.0722 * b) >= 128 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v; 
      }
      context.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL();

      this.worker.recognize(
        dataUrl,
      ).then(({ data: { text } }) => {
        this.licensePlates.push(text);
        setTimeout(() => {
          this.licensePlates = [...this.licensePlates];
        }, 0);
      });
    }
  }
}