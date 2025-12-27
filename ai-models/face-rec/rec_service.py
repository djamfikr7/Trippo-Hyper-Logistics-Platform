from deepface import DeepFace
import sys
import json
import base64
import cv2
import numpy as np

def verify_face(img1_path, img2_path):
    try:
        result = DeepFace.verify(img1_path = img1_path, img2_path = img2_path)
        return result
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 2:
        img1 = sys.argv[1]
        img2 = sys.argv[2]
        res = verify_face(img1, img2)
        print(json.dumps(res))
