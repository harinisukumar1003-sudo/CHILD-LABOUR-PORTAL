package com.clrms.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Constraint(validatedBy = CaseReportSubmissionValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidCaseReportSubmission {
    String message() default "Report submission is invalid";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
