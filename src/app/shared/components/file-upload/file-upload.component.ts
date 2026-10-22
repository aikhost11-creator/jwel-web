import { Component, Input, OnInit } from '@angular/core';
import { FileUploadService } from './file-upload.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedService } from '../../services/shared.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss'
})
export class FileUploadComponent implements OnInit{
  @Input() directory;
  @Input() dimentions;
  @Input() type;
  selectedFile: File | null = null;
  imagePrv : string = '';
  videoPrv : string = '';
  uploadedUrl: string = '';
  directoryName: string = 'Redefined/';

  fileUrl : string = '';
  fileId : string = '';
  fileData : any;

  constructor(public activeModal: NgbActiveModal , public sharedservice: SharedService , private fileUploadService: FileUploadService) {}

  ngOnInit(): void {
    this.directoryName = this.directory;
  }

  getImagePreview(event) {
    const reader = new FileReader();
    let imagePath = event.target.files[0];
        
    if(this.type == 'image'){
      if (imagePath.type == 'image/png' || imagePath.type == 'image/jpeg' || imagePath.type == 'image/svg' || imagePath.type == 'image/svg+xml' || imagePath.type == 'image/jpg' || imagePath.type == 'image/webp' || imagePath.type == 'image/gif') {
          reader.readAsDataURL(imagePath);
          reader.onload = (e) => {
              const Img = new Image();
              Img.src = URL.createObjectURL(event.target.files[0]);
              Img.onload = (e: any) => {
                const h = e.target.height;
                const w = e.target.width;
  
                if(this.dimentions){
                  if(h == this.dimentions.height && w == this.dimentions.width){
                    this.imagePrv = String(reader.result);
                    this.onFileSelected(event);
                  }else{
                    this.sharedservice.showAlert(2, `Upload Image (${this.dimentions.width} x ${this.dimentions.height})`);
                  }
                }else{
                  this.imagePrv = String(reader.result);
                  this.onFileSelected(event);
                }
              };
          };
      } else {
          this.sharedservice.showAlert(2,'Upload PNG/JPG/WEBP/GIF Thumbnail!');
      }
    }else if(this.type == 'video'){
      if (
        imagePath.type === 'video/mp4' ||
        imagePath.type === 'video/webm' ||
        imagePath.type === 'video/ogg'
      ) {
        const reader = new FileReader();
        reader.readAsDataURL(imagePath);
        reader.onload = (e) => {
          this.videoPrv = String(reader.result); // Optional: video preview
          this.onFileSelected(event); // Your upload handler
        };
      } else {
        this.sharedservice.showAlert(2, 'Upload MP4/WEBM/OGG Video Only!');
      }
    }else{
      reader.onload = (e) => {
        // Store base64 string or file object depending on your use case
        this.fileData = reader.result;

        // Show preview only for image types (optional)
        if (event.target.files[0].type.startsWith('image/')) {
          this.imagePrv = String(reader.result);
        }

        // Call your file select handler
        this.onFileSelected(event);
      };

      // Start reading the file
      reader.readAsDataURL(event.target.files[0]);
    }
}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadFile() {
    if (!this.selectedFile || !this.directoryName) return;

    this.fileUploadService.uploadFile(this.selectedFile, this.directoryName).subscribe(
      (response) => {
        this.uploadedUrl = response.file.url;
        this.fileUrl = response.file.url;
        this.fileId = response.fileId;
        this.sharedservice.showAlert(1,'File uploaded successfully!');
      },
      (error) => {
        this.sharedservice.showAlert(2,'Something Went Wrong');
      }
    );
  }
  deleteFile(){
    this.fileUploadService.deleteFile(4).subscribe((res : any) => {
      console.log('res -->', res);
      
    })
  }
  getFoldersByPath(path){
    this.fileUploadService.getFoldersByPath({ path }).subscribe((res : any) => {
      console.log('res -->', res.folders);
      
    })
  }
  getFilesByPath(path){
    this.fileUploadService.getFilesByPath({ path }).subscribe((res : any) => {
      console.log('res -->', res.folders);
      
    })
  }

  close(){
    if(this.fileUrl){
      this.activeModal.close({status : true, url : this.fileUrl, fileId : this.fileId});
    }else{
      this.activeModal.close();
    }
  }
}