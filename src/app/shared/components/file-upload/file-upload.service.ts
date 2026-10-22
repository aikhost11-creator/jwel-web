import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { urlConstant } from '../../constant/urlConst';

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {

  constructor(private http: HttpClient) {}

  uploadFile(file: File, directoryName: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dirName', directoryName);

    return this.http.post(urlConstant.FilesAPI.fileUpload, formData);
  }
  deleteFile(id) {
    return this.http.delete<any>(urlConstant.FilesAPI.deleteFile+id);
  }
  getFoldersByPath(data) {
    return this.http.post<any>(urlConstant.FilesAPI.getFoldersByPath, data);
  }
  getFilesByPath(data) {
    return this.http.post<any>(urlConstant.FilesAPI.getFilesByPath, data);
  }
}
